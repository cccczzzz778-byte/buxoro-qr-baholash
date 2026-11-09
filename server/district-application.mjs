import { randomBytes } from 'node:crypto';
import { database, sql, normalizedName } from './database.mjs';
import { digest, equal, sign, secret, clientToken, csrfFor, publicBase, requestOrigin } from './security.mjs';
import { securityHeaders } from './application.mjs';

const districts = ['Buxoro shahri','Kogon shahri','Buxoro tumani','Vobkent tumani','G‘ijduvon tumani','Jondor tumani','Kogon tumani','Olot tumani','Peshku tumani','Qorako‘l tumani','Qorovulbozor tumani','Romitan tumani','Shofirkon tumani'];
const usernamePattern = /^[a-z0-9._-]{3,40}$/;
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

function parseSessionToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [nonce, payload, signature] = parts;
  if (!nonce || !payload || !equal(signature, sign(`session:${nonce}.${payload}`))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.role === 'district' && districts.includes(data.district) && usernamePattern.test(String(data.username || ''))) {
      return { role: 'district', district: data.district, username: data.username };
    }
  } catch {}
  return null;
}

async function districtSession(db, req, mutation = false) {
  const token = clientToken(req);
  if (!token || token.length > 512) fail(401, 'Tizimga qayta kiring.');
  const [row] = await db.all(sql`SELECT token_hash FROM admin_sessions WHERE token_hash=${digest(token)} AND expires_at>${isoNow()}`);
  if (!row) fail(401, 'Tizimga qayta kiring.');
  const scope = parseSessionToken(token);
  if (!scope) fail(403, 'Bu bo‘lim faqat tuman/shahar loginlari uchun.');
  if (mutation && !equal(req.headers['x-csrf-token'], csrfFor(token))) fail(403, 'Sahifani yangilab, qayta urinib ko‘ring.');
  return { ...scope, token };
}

async function newInstitutionId(db) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = `INST-BUX-${randomBytes(5).toString('hex').toUpperCase()}`;
    const [exists] = await db.all(sql`SELECT id FROM institutions WHERE id=${id}`);
    if (!exists) return id;
  }
  fail(500, 'Muassasa kodi yaratilmadi. Qayta urinib ko‘ring.');
}

function typeOf(name) {
  const n = String(name || '').normalize('NFKC').toLowerCase().replace(/[‘’ʻʼ`]/g, "'");
  if (/(^|\s)oshp($|\s)|oilaviy shifokorlik punkti|shifokorlik punkti/.test(n)) return 'OSHP';
  if (/(^|\s)op($|\s)|oilaviy poliklinika|poliklinika/.test(n)) return 'OP';
  return 'Boshqa';
}

function present(row, req) {
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    address: row.address,
    active: Boolean(row.active),
    type: typeOf(row.name),
    feedbackUrl: `${publicBase(req)}/?m=${encodeURIComponent(row.id)}`,
    qrUrl: `/api/qr/${encodeURIComponent(row.id)}.png`,
    posterUrl: `/poster/${encodeURIComponent(row.id)}`
  };
}

export default async function districtApplication(req, res) {
  securityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  try {
    secret();
    const url = new URL(req.url, requestOrigin(req));
    const route = url.pathname.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '');
    const method = req.method;
    if (!['GET','POST','DELETE'].includes(method)) fail(405, 'Bu amal qo‘llab-quvvatlanmaydi.');
    if (method !== 'GET') {
      const origin = req.headers.origin;
      if (origin && ![requestOrigin(req), publicBase(req)].includes(origin)) fail(403, 'Bu manzildan so‘rov yuborish mumkin emas.');
      if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'So‘rov manzili tasdiqlanmadi.');
    }
    if (route !== 'district/institutions' && route !== 'district/departments' && !/^district\/departments\/[0-9]+\/doctors$/.test(route) && !/^district\/doctors\/[0-9]+$/.test(route)) fail(404, 'Sahifa topilmadi.');

    const db = await database();
    const auth = await districtSession(db, req, method !== 'GET');


    // Hudud foydalanuvchisi faqat o‘z hududidagi muassasa bo‘limlarini boshqaradi.
    if (route === 'district/departments') {
      if (method === 'GET') {
        const rows = await db.all(sql`SELECT d.id, d.institution_id, d.name, i.name AS institution_name, i.district
          FROM medical_departments d JOIN institutions i ON i.id=d.institution_id
          WHERE i.district=${auth.district} ORDER BY i.name,d.name`);
        const doctors = await db.all(sql`SELECT p.id,p.department_id,p.full_name,p.specialty
          FROM medical_doctors p JOIN medical_departments d ON d.id=p.department_id
          JOIN institutions i ON i.id=d.institution_id WHERE i.district=${auth.district}
          ORDER BY p.full_name`);
        const institutions = await db.all(sql`SELECT id,name FROM institutions WHERE district=${auth.district} AND active=1 ORDER BY name`);
        return json(res,200,{district:auth.district,institutions,departments:rows.map(d=>({...d,doctors:doctors.filter(p=>Number(p.department_id)===Number(d.id))}))});
      }
      if (method !== 'POST') fail(405,'Ruxsat etilmagan amal.');
      const data=await body(req);
      const institutionId=field(data.institutionId,'Muassasa',5,70);
      const name=field(data.name,'Bo‘lim nomi',2,160);
      const [owned]=await db.all(sql`SELECT id FROM institutions WHERE id=${institutionId} AND district=${auth.district} AND active=1`);
      if(!owned) fail(403,'Muassasa sizning hududingizga tegishli emas.');
      const [duplicate]=await db.all(sql`SELECT id FROM medical_departments WHERE institution_id=${institutionId} AND lower(name)=lower(${name})`);
      if(duplicate) fail(409,'Ushbu bo‘lim avval qo‘shilgan.');
      const [created]=await db.all(sql`INSERT INTO medical_departments(institution_id,name,created_at)
        VALUES(${institutionId},${name},${isoNow()}) RETURNING id`);
      return json(res,201,{ok:true,id:created.id});
    }
    const doctorRoute=route.match(/^district\/departments\/([0-9]+)\/doctors$/);
    if(doctorRoute){
      if(method!=='POST') fail(405,'Ruxsat etilmagan amal.');
      const data=await body(req);
      const fullName=field(data.fullName,'Shifokor F.I.Sh.',3,160);
      const specialty=field(data.specialty??'','Mutaxassislik',0,120);
      const departmentId=Number(doctorRoute[1]);
      const [owned]=await db.all(sql`SELECT d.id FROM medical_departments d JOIN institutions i ON i.id=d.institution_id
        WHERE d.id=${departmentId} AND i.district=${auth.district} AND i.active=1`);
      if(!owned)fail(403,'Bo‘lim sizning hududingizga tegishli emas.');
      const [duplicate]=await db.all(sql`SELECT id FROM medical_doctors WHERE department_id=${departmentId} AND lower(full_name)=lower(${fullName})`);
      if(duplicate)fail(409,'Ushbu shifokor ro‘yxatda bor.');
      const [created]=await db.all(sql`INSERT INTO medical_doctors(department_id,full_name,specialty,created_at)
        VALUES(${departmentId},${fullName},${specialty},${isoNow()}) RETURNING id`);
      return json(res,201,{ok:true,id:created.id});
    }
    const deleteDoctor=route.match(/^district\/doctors\/([0-9]+)$/);
    if(deleteDoctor){
      if(method!=='DELETE')fail(405,'Ruxsat etilmagan amal.');
      const id=Number(deleteDoctor[1]);
      const rows=await db.all(sql`DELETE FROM medical_doctors WHERE id=${id}
        AND department_id IN (SELECT d.id FROM medical_departments d
          JOIN institutions i ON i.id=d.institution_id WHERE i.district=${auth.district}) RETURNING id`);
      if(!rows.length)fail(404,'Shifokor topilmadi yoki huquqingiz yetarli emas.');
      return json(res,200,{ok:true});
    }
    if (method === 'GET') {
      const rows = await db.all(sql`SELECT * FROM institutions WHERE district=${auth.district} ORDER BY active DESC, created_at DESC, name`);
      return json(res, 200, { district: auth.district, institutions: rows.filter(row => ['OP','OSHP'].includes(typeOf(row.name))).map(row => present(row, req)) });
    }

    const data = await body(req);
    const type = field(data.type, 'Muassasa turi', 2, 4).toUpperCase();
    if (!['OP','OSHP'].includes(type)) fail(400, 'Faqat OP yoki OSHP qo‘shish mumkin.');
    const rawName = field(data.name, 'Muassasa nomi', 2, 180);
    const address = field(data.address ?? '', 'Manzil', 0, 240);
    const name = typeOf(rawName) === type ? rawName : `${rawName} (${type})`;
    const nameKey = normalizedName(name, auth.district);
    const [duplicate] = await db.all(sql`SELECT id FROM institutions WHERE name_key=${nameKey}`);
    if (duplicate) fail(409, 'Bu muassasa ushbu hududda allaqachon mavjud.');

    const id = await newInstitutionId(db);
    await db.all(sql`INSERT INTO institutions (id,name,district,address,name_key,active,created_at) VALUES (${id},${name},${auth.district},${address},${nameKey},1,${isoNow()})`);
    const [row] = await db.all(sql`SELECT * FROM institutions WHERE id=${id}`);
    return json(res, 201, { ok: true, institution: present(row, req), message: `${type} muvaffaqiyatli qo‘shildi. QR-kod avtomatik yaratildi.` });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error(error);
    return json(res, status, { error: status >= 500 ? 'Server bilan bog‘lanishda xatolik.' : error.message });
  }
}
