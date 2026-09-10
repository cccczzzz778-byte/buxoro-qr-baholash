import { database, sql } from './database.mjs';
import { sign, secret, requestOrigin, publicBase } from './security.mjs';
import { securityHeaders, dayInTashkent } from './application.mjs';

const codePattern = /^INST-BUX-[A-Z0-9-]{4,40}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const services = ['Umumiy qabul', 'Terapevt qabuli', 'Pediatr qabuli', 'Kardiolog qabuli', 'Nevrolog qabuli', 'Laboratoriya', 'Diagnostika', 'Boshqa xizmat'];

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const isoNow = () => new Date().toISOString();

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}

async function body(req) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) fail(415, 'Ma’lumot JSON shaklida yuborilishi kerak.');
  if (Number(req.headers['content-length'] || 0) > 16384) fail(413, 'Yuborilgan ma’lumot juda katta.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) fail(413, 'Yuborilgan ma’lumot juda katta.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') fail(400, 'Ma’lumot shakli noto‘g‘ri.');
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    fail(400, 'Ma’lumot shakli noto‘g‘ri.');
  }
}

function field(value, label, min, max) {
  if (typeof value !== 'string') fail(400, `${label}ni to‘g‘ri kiriting.`);
  const clean = value.normalize('NFKC').trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  if (clean.length < min || clean.length > max) fail(400, `${label}: ${min}–${max} ta belgi bo‘lishi kerak.`);
  return clean;
}

function guardOrigin(req) {
  const origin = req.headers.origin;
  if (origin && ![requestOrigin(req), publicBase(req)].includes(origin)) fail(403, 'Bu manzildan so‘rov yuborish mumkin emas.');
  if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'So‘rov manzili tasdiqlanmadi.');
}

async function rateLimit(db, req) {
  const remote = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'local';
  const bucket = Math.floor(Date.now() / 3600000);
  const key = sign(`feedback:${remote}:${bucket}`);
  const expires = new Date((bucket + 1) * 3600000).toISOString();
  const [row] = await db.all(sql`INSERT INTO rate_limits (key,hits,expires_at) VALUES (${key},1,${expires}) ON CONFLICT (key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits`);
  if (Number(row.hits) > 60) fail(429, 'Juda ko‘p urinish bo‘ldi. Birozdan keyin qayta urinib ko‘ring.');
}

export default async function feedbackSubmit(req, res) {
  securityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  try {
    secret();
    if (req.method !== 'POST') fail(405, 'Bu amal qo‘llab-quvvatlanmaydi.');
    guardOrigin(req);
    const data = await body(req);
    if (!uuidPattern.test(data.id || '')) fail(400, 'Yuborish identifikatori noto‘g‘ri. Sahifani yangilang.');
    if (data.website) fail(400, 'So‘rov tasdiqlanmadi.');
    if (data.consent !== true) fail(400, 'Fikringiz saqlanishiga rozilik bildiring.');

    const db = await database();
    if (!codePattern.test(data.institutionId || '')) fail(404, 'Muassasa topilmadi. QR-kodni tekshiring.');
    const [institution] = await db.all(sql`SELECT * FROM institutions WHERE id=${data.institutionId}`);
    if (!institution) fail(404, 'Muassasa topilmadi. QR-kodni tekshiring.');
    if (!institution.active) fail(410, 'Bu muassasada baholash vaqtincha to‘xtatilgan.');

    const doctor = field(data.doctor, 'Shifokor ismi', 2, 120);
    const service = field(data.service ?? 'Umumiy qabul', 'Xizmat turi', 1, 80);
    if (!services.includes(service)) fail(400, 'Xizmat turini ro‘yxatdan tanlang.');
    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) fail(400, '1 dan 5 gacha baho tanlang.');

    const isComplaint = data.isComplaint === true;
    if (isComplaint && data.rating > 3) fail(400, 'Shikoyat uchun maksimal baho 3 yulduz.');
    if (!isComplaint && data.rating < 4) fail(400, 'Oddiy baholashda kamida 4 yulduz tanlang.');

    const comment = field(data.comment ?? '', 'Izoh / shikoyat', isComplaint ? 1 : 0, 1000);
    const citizenName = field(isComplaint ? (data.citizenName ?? '') : '', 'Ism-familiya', isComplaint ? 1 : 0, 120);
    const citizenPhone = field(isComplaint ? (data.citizenPhone ?? '') : '', 'Telefon raqami', isComplaint ? 7 : 0, 30);
    if (isComplaint && !/^[+0-9()\-\s]{7,30}$/.test(citizenPhone)) fail(400, 'Telefon raqamini to‘g‘ri kiriting.');

    await rateLimit(db, req);
    await db.all(sql`INSERT INTO feedbacks (id,institution_id,doctor,service,rating,comment,is_complaint,citizen_name,citizen_phone,status,day,created_at) VALUES (${data.id},${institution.id},${doctor},${service},${data.rating},${comment},${isComplaint ? 1 : 0},${citizenName},${citizenPhone},'new',${dayInTashkent()},${isoNow()}) ON CONFLICT DO NOTHING`);
    return json(res, 201, { ok: true, id: data.id });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error(error);
    return json(res, status, { error: status >= 500 ? 'Server bilan bog‘lanishda xatolik.' : error.message });
  }
}
