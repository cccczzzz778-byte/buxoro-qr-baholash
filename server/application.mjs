import './config.mjs';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { database, sql, normalizedName } from './database.mjs';
import { randomToken, digest, equal, secret, sign, verifyPassword,
  clientToken, csrfFor, requestOrigin, publicBase, cookie } from './security.mjs';

const services = ['Umumiy qabul', 'Terapevt qabuli', 'Pediatr qabuli', 'Kardiolog qabuli', 'Nevrolog qabuli', 'Laboratoriya', 'Diagnostika', 'Boshqa xizmat'];
const codePattern = /^INST-BUX-[A-Z0-9-]{4,40}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const dayInTashkent = (time = Date.now()) => new Date(time + 5 * 3600000).toISOString().slice(0, 10);
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const isoNow = () => new Date().toISOString();

export function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}
function json(res, status, value) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); }
async function body(req) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) fail(415, 'Ma’lumot JSON shaklida yuborilishi kerak.');
  if (Number(req.headers['content-length'] || 0) > 16384) fail(413, 'Yuborilgan ma’lumot juda katta.');
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 16384) fail(413, 'Yuborilgan ma’lumot juda katta.'); chunks.push(chunk); }
  let value; try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Ma’lumot shakli noto‘g‘ri.'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') fail(400, 'Ma’lumot shakli noto‘g‘ri.');
  return value;
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
async function session(db, req, mutation = false) {
  const token = clientToken(req); if (!token || token.length > 100) fail(401, 'Boshqaruv paneliga qayta kiring.');
  const hash = digest(token); const [row] = await db.all(sql`SELECT token_hash FROM admin_sessions WHERE token_hash=${hash} AND expires_at>${isoNow()}`);
  if (!row) fail(401, 'Boshqaruv paneliga qayta kiring.');
  if (mutation && !equal(req.headers['x-csrf-token'], csrfFor(token))) fail(403, 'Sahifani yangilab, qayta urinib ko‘ring.');
  return { token, hash };
}
async function rateLimit(db, req, action, limit, windowMs) {
  const remote = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'local';
  const bucket = Math.floor(Date.now() / windowMs); const key = sign(`${action}:${remote}:${bucket}`); const expires = new Date((bucket + 1) * windowMs).toISOString();
  const [row] = await db.all(sql`INSERT INTO rate_limits (key,hits,expires_at) VALUES (${key},1,${expires}) ON CONFLICT (key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits`);
  if (Number(row.hits) > limit) fail(429, 'Juda ko‘p urinish bo‘ldi. Birozdan keyin qayta urinib ko‘ring.');
}
async function institution(db, code, requireActive = false) {
  if (!codePattern.test(code)) fail(404, 'Muassasa topilmadi. QR-kodni tekshiring.');
  const [row] = await db.all(sql`SELECT * FROM institutions WHERE id=${code}`); if (!row) fail(404, 'Muassasa topilmadi. QR-kodni tekshiring.');
  if (requireActive && !row.active) fail(410, 'Bu muassasada baholash vaqtincha to‘xtatilgan.'); return row;
}
function presentInstitution(row, req) {
  return { id: row.id, name: row.name, district: row.district, address: row.address, active: Boolean(row.active), createdAt: row.created_at,
    feedbackUrl: `${publicBase(req)}/?m=${encodeURIComponent(row.id)}`, qrUrl: `/api/qr/${encodeURIComponent(row.id)}.png`, posterUrl: `/poster/${encodeURIComponent(row.id)}` };
}
async function qr(row, req, format = 'png') {
  const options = { width: 900, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#071b34', light: '#ffffff' } };
  const url = presentInstitution(row, req).feedbackUrl;
  return format === 'svg' ? QRCode.toString(url, { ...options, type: 'svg' }) : QRCode.toBuffer(url, options);
}
async function newInstitutionId(db) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = `INST-BUX-${randomBytes(5).toString('hex').toUpperCase()}`;
    const [exists] = await db.all(sql`SELECT id FROM institutions WHERE id=${id}`);
    if (!exists) return id;
  }
  fail(500, 'Muassasa kodi yaratilmadi. Qayta urinib ko‘ring.');
}
function csvCell(value) { let text = String(value ?? ''); if (/^[\s]*[=+@-]|^[\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; }

export default async function application(req, res) {
  securityHeaders(res); res.setHeader('Cache-Control', 'no-store');
  try {
    secret(); const url = new URL(req.url, requestOrigin(req)); let route = url.pathname.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, ''); const method = req.method;
    if (!['GET','POST','PATCH','DELETE'].includes(method)) fail(405, 'Bu amal qo‘llab-quvvatlanmaydi.'); if (method !== 'GET') guardOrigin(req);
    const db = await database();
    if (route === 'health' && method === 'GET') { await db.all(sql`SELECT 1 AS ok`); return json(res, 200, { ok: true, version: '2.1.0' }); }
    if (route === 'institutions' && method === 'GET') {
      const rows = await db.all(sql`SELECT * FROM institutions WHERE active=1 ORDER BY name`); return json(res, 200, { institutions: rows.map(row => presentInstitution(row, req)), services });
    }
    const institutionMatch = route.match(/^institutions\/([^/]+)$/);
    if (institutionMatch && method === 'GET') { const row = await institution(db, institutionMatch[1], true); return json(res, 200, { institution: presentInstitution(row, req), services }); }
    const qrMatch = route.match(/^(?:qr|legacy-qr)\/([^/]+)\.(png|svg)$/);
    if (qrMatch && method === 'GET') { const row = await institution(db, qrMatch[1]); res.setHeader('Content-Type', qrMatch[2] === 'svg' ? 'image/svg+xml' : 'image/png'); return res.end(await qr(row, req, qrMatch[2])); }
    if (route === 'feedback' && method === 'POST') {
      const data = await body(req); if (!uuidPattern.test(data.id || '')) fail(400, 'Yuborish identifikatori noto‘g‘ri. Sahifani yangilang.'); if (data.website) fail(400, 'So‘rov tasdiqlanmadi.'); if (data.consent !== true) fail(400, 'Fikringiz saqlanishiga rozilik bildiring.');
      const row = await institution(db, data.institutionId || '', true); const doctor = field(data.doctor, 'Shifokor ismi', 2, 120); const comment = field(data.comment ?? '', 'Izoh', 0, 1000);
      const isComplaint = data.isComplaint === true; const citizenName = field(isComplaint ? (data.citizenName ?? '') : '', 'Fuqaro ismi', 0, 120); const citizenPhone = field(isComplaint ? (data.citizenPhone ?? '') : '', 'Telefon raqami', 0, 30);
      if (citizenPhone && !/^[+0-9()\-\s]{7,30}$/.test(citizenPhone)) fail(400, 'Telefon raqamini to‘g‘ri kiriting.');
      const service = field(data.service ?? 'Umumiy qabul', 'Xizmat turi', 1, 80); if (!services.includes(service)) fail(400, 'Xizmat turini ro‘yxatdan tanlang.');
      if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) fail(400, '1 dan 5 gacha baho tanlang.');
      await rateLimit(db, req, 'feedback', 60, 3600000);
      await db.all(sql`INSERT INTO feedbacks (id,institution_id,doctor,service,rating,comment,is_complaint,citizen_name,citizen_phone,status,day,created_at) VALUES (${data.id},${row.id},${doctor},${service},${data.rating},${comment},${isComplaint ? 1 : 0},${citizenName},${citizenPhone},'new',${dayInTashkent()},${isoNow()}) ON CONFLICT DO NOTHING`);
      return json(res, 201, { ok: true, id: data.id });
    }
    if (route === 'auth/login' && method === 'POST') {
      await rateLimit(db, req, 'login', 12, 15 * 60000); const data = await body(req); const username = field(data.username, 'Login', 1, 80); const password = field(data.password, 'Parol', 1, 256);
      const [setting] = await db.all(sql`SELECT value FROM app_settings WHERE key='admin_password'`); if (!equal(username, process.env.ADMIN_USERNAME || 'admin') || !await verifyPassword(password, setting.value)) fail(401, 'Login yoki parol noto‘g‘ri.');
      const token = randomToken(), seconds = data.remember === true ? 7 * 86400 : 8 * 3600; await db.all(sql`INSERT INTO admin_sessions (token_hash,expires_at) VALUES (${digest(token)},${new Date(Date.now()+seconds*1000).toISOString()})`); res.setHeader('Set-Cookie', cookie(req, token, seconds)); return json(res, 200, { username, csrf: csrfFor(token) });
    }
    if (route === 'auth/session' && method === 'GET') { const auth = await session(db, req); return json(res, 200, { username: process.env.ADMIN_USERNAME || 'admin', csrf: csrfFor(auth.token), publicBaseUrl: publicBase(req) }); }
    if (!route.startsWith('admin/')) fail(404, 'Sahifa topilmadi.');
    await session(db, req, method !== 'GET');

    if (route === 'admin/institutions' && method === 'GET') {
      const rows = await db.all(sql`SELECT i.*, COUNT(f.id) AS feedback_count, AVG(f.rating) AS average_rating FROM institutions i LEFT JOIN feedbacks f ON f.institution_id=i.id GROUP BY i.id ORDER BY i.active DESC, i.created_at DESC, i.name`);
      return json(res, 200, { institutions: rows.map(row => ({ ...presentInstitution(row, req), feedbackCount: Number(row.feedback_count), averageRating: row.average_rating === null ? null : Number(row.average_rating) })) });
    }
    if (route === 'admin/institutions' && method === 'POST') {
      const data = await body(req);
      const name = field(data.name, 'Muassasa nomi', 2, 180);
      const district = field(data.district, 'Hudud', 2, 120);
      const address = field(data.address ?? '', 'Manzil', 0, 240);
      const nameKey = normalizedName(name, district);
      const [duplicate] = await db.all(sql`SELECT id FROM institutions WHERE name_key=${nameKey}`);
      if (duplicate) fail(409, 'Bu muassasa va hudud allaqachon mavjud.');
      const id = await newInstitutionId(db); const createdAt = isoNow();
      await db.all(sql`INSERT INTO institutions (id,name,district,address,name_key,active,created_at) VALUES (${id},${name},${district},${address},${nameKey},1,${createdAt})`);
      const row = await institution(db, id);
      return json(res, 201, { ok: true, institution: presentInstitution(row, req) });
    }
    const adminInstitutionMatch = route.match(/^admin\/institutions\/([^/]+)$/);
    if (adminInstitutionMatch && method === 'PATCH') {
      const row = await institution(db, adminInstitutionMatch[1]); const data = await body(req);
      if (typeof data.active !== 'boolean') fail(400, 'Holat noto‘g‘ri.');
      await db.all(sql`UPDATE institutions SET active=${data.active ? 1 : 0} WHERE id=${row.id}`);
      const updated = await institution(db, row.id);
      return json(res, 200, { ok: true, institution: presentInstitution(updated, req) });
    }
    if (adminInstitutionMatch && method === 'DELETE') {
      const row = await institution(db, adminInstitutionMatch[1]);
      const [usage] = await db.all(sql`SELECT COUNT(*) AS count FROM feedbacks WHERE institution_id=${row.id}`);
      const count = Number(usage?.count || 0);
      if (count > 0) {
        await db.all(sql`UPDATE institutions SET active=0 WHERE id=${row.id}`);
        return json(res, 200, { ok: true, archived: true, message: 'Muassasa baholash ro‘yxatidan olib tashlandi. Avvalgi fikrlar saqlandi.' });
      }
      await db.all(sql`DELETE FROM institutions WHERE id=${row.id}`);
      return json(res, 200, { ok: true, deleted: true });
    }
    if (route === 'admin/feedback' && method === 'GET') { const rows = await db.all(sql`SELECT f.*, i.name AS institution_name FROM feedbacks f JOIN institutions i ON i.id=f.institution_id ORDER BY f.created_at DESC LIMIT 500`); return json(res, 200, { feedback: rows }); }
    if (route === 'admin/export.csv' && method === 'GET') { const rows = await db.all(sql`SELECT f.*,i.name AS institution_name,i.district FROM feedbacks f JOIN institutions i ON i.id=f.institution_id ORDER BY f.created_at DESC`); const header = ['Sana','Muassasa','Hudud','Shifokor','Xizmat','Baho','Izoh','Shikoyat','Ism-familiya','Telefon']; const lines = [header.map(csvCell).join(',')]; for (const row of rows) lines.push([row.created_at,row.institution_name,row.district,row.doctor,row.service,row.rating,row.comment,row.is_complaint?'Ha':'Yo‘q',row.citizen_name,row.citizen_phone].map(csvCell).join(',')); res.statusCode = 200; res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="buxoro-feedback.csv"'); return res.end('\ufeff'+lines.join('\n')); }
    fail(404, 'Sahifa topilmadi.');
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500; if (status >= 500) console.error(error); return json(res, status, { error: status >= 500 ? 'Server bilan bog‘lanishda xatolik.' : error.message });
  }
}
