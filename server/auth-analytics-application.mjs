import { database, sql } from './database.mjs';
import { randomToken, digest, equal, secret, sign, verifyPassword, clientToken, csrfFor, requestOrigin, publicBase, cookie } from './security.mjs';
import { securityHeaders } from './application.mjs';

const districts = ['Buxoro shahri','Kogon shahri','Buxoro tumani','Vobkent tumani','G‘ijduvon tumani','Jondor tumani','Kogon tumani','Olot tumani','Peshku tumani','Qorako‘l tumani','Qorovulbozor tumani','Romitan tumani','Shofirkon tumani'];
const usernamePattern = /^[a-z0-9._-]{3,40}$/;
const districtUserPrefix = 'district_user:';
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

function makeSessionToken(scope) {
  const nonce = randomToken();
  const payload = Buffer.from(JSON.stringify(scope)).toString('base64url');
  const signature = sign(`session:${nonce}.${payload}`);
  return `${nonce}.${payload}.${signature}`;
}

function parseSessionToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [nonce, payload, signature] = parts;
  if (!nonce || !payload || !equal(signature, sign(`session:${nonce}.${payload}`))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.role === 'admin') return { role: 'admin', district: '', username: String(data.username || process.env.ADMIN_USERNAME || 'admin') };
    if (data.role === 'management' && usernamePattern.test(String(data.username || ''))) return { role: 'management', district: '', username: data.username };
    if (data.role === 'district' && districts.includes(data.district) && usernamePattern.test(String(data.username || ''))) return { role: 'district', district: data.district, username: data.username };
  } catch {}
  return null;
}

async function session(db, req) {
  const token = clientToken(req);
  if (!token || token.length > 512) fail(401, 'Tizimga qayta kiring.');
  const [row] = await db.all(sql`SELECT token_hash FROM admin_sessions WHERE token_hash=${digest(token)} AND expires_at>${isoNow()}`);
  if (!row) fail(401, 'Tizimga qayta kiring.');
  const scope = parseSessionToken(token);
  if (!scope) fail(401, 'Tizimga qayta kiring.');
  return { ...scope, token };
}

async function rateLimit(db, req) {
  const remote = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'local';
  const bucket = Math.floor(Date.now() / (15 * 60000));
  const key = sign(`login:${remote}:${bucket}`);
  const expires = new Date((bucket + 1) * 15 * 60000).toISOString();
  const [row] = await db.all(sql`INSERT INTO rate_limits (key,hits,expires_at) VALUES (${key},1,${expires}) ON CONFLICT (key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits`);
  if (Number(row.hits) > 20) fail(429, 'Juda ko‘p urinish bo‘ldi. Birozdan keyin qayta urinib ko‘ring.');
}

function guardOrigin(req) {
  const origin = req.headers.origin;
  if (origin && ![requestOrigin(req), publicBase(req)].includes(origin)) fail(403, 'Bu manzildan so‘rov yuborish mumkin emas.');
  if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'So‘rov manzili tasdiqlanmadi.');
}

function presentInstitution(row, req) {
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    address: row.address,
    active: Boolean(row.active),
    createdAt: row.created_at,
    feedbackUrl: `${publicBase(req)}/?m=${encodeURIComponent(row.id)}`,
    qrUrl: `/api/qr/${encodeURIComponent(row.id)}.png`,
    posterUrl: `/poster/${encodeURIComponent(row.id)}`
  };
}

export default async function authAnalyticsApplication(req, res) {
  securityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  try {
    secret();
    const url = new URL(req.url, requestOrigin(req));
    const route = url.pathname.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '');
    const method = req.method;
    const db = await database();

    if (route === 'auth/login' && method === 'POST') {
      guardOrigin(req);
      await rateLimit(db, req);
      const data = await body(req);
      const username = field(data.username, 'Login', 1, 80).toLowerCase();
      const password = field(data.password, 'Parol', 1, 256);
      let scope = null;

      const [adminSetting] = await db.all(sql`SELECT value FROM app_settings WHERE key='admin_password'`);
      const adminUsername = String(process.env.ADMIN_USERNAME || 'admin').toLowerCase();
      if (equal(username, adminUsername) && await verifyPassword(password, adminSetting?.value)) {
        scope = { role: 'admin', district: '', username: process.env.ADMIN_USERNAME || 'admin' };
      }

      if (!scope && username === 'boshqarma') {
        const [managementSetting] = await db.all(sql`SELECT value FROM app_settings WHERE key='management_password'`);
        if (await verifyPassword(password, managementSetting?.value)) scope = { role: 'management', district: '', username: 'boshqarma' };
      }

      if (!scope && usernamePattern.test(username)) {
        const [saved] = await db.all(sql`SELECT value FROM app_settings WHERE key=${districtUserPrefix + username}`);
        if (saved?.value) {
          try {
            const user = JSON.parse(saved.value);
            if (user.active !== false && districts.includes(user.district) && await verifyPassword(password, user.passwordHash)) {
              scope = { role: 'district', district: user.district, username: user.username };
            }
          } catch {}
        }
      }

      if (!scope) fail(401, 'Login yoki parol noto‘g‘ri.');
      const token = makeSessionToken(scope);
      const seconds = data.remember === true ? 7 * 86400 : 8 * 3600;
      await db.all(sql`INSERT INTO admin_sessions (token_hash,expires_at) VALUES (${digest(token)},${new Date(Date.now()+seconds*1000).toISOString()})`);
      res.setHeader('Set-Cookie', cookie(req, token, seconds));
      return json(res, 200, { ...scope, csrf: csrfFor(token), next: scope.role === 'admin' ? '/dashboard' : '/analytics.html' });
    }

    if (route === 'auth/session' && method === 'GET') {
      const auth = await session(db, req);
      return json(res, 200, { username: auth.username, role: auth.role, district: auth.district, csrf: csrfFor(auth.token), publicBaseUrl: publicBase(req) });
    }

    if (route === 'analytics/institutions' && method === 'GET') {
      const auth = await session(db, req);
      const rows = auth.role === 'district'
        ? await db.all(sql`SELECT * FROM institutions WHERE district=${auth.district} ORDER BY active DESC,name`)
        : await db.all(sql`SELECT * FROM institutions ORDER BY active DESC,name`);
      return json(res, 200, { scope: { role: auth.role, district: auth.district }, institutions: rows.map(row => presentInstitution(row, req)) });
    }

    if (route === 'analytics/feedback' && method === 'GET') {
      const auth = await session(db, req);
      const rows = auth.role === 'district'
        ? await db.all(sql`SELECT f.id,f.institution_id,f.rating,f.is_complaint,f.day,f.created_at FROM feedbacks f JOIN institutions i ON i.id=f.institution_id WHERE i.district=${auth.district} ORDER BY f.created_at DESC`)
        : await db.all(sql`SELECT f.id,f.institution_id,f.rating,f.is_complaint,f.day,f.created_at FROM feedbacks f ORDER BY f.created_at DESC`);
      return json(res, 200, { scope: { role: auth.role, district: auth.district }, feedback: rows });
    }

    fail(404, 'Sahifa topilmadi.');
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error(error);
    return json(res, status, { error: status >= 500 ? 'Server bilan bog‘lanishda xatolik.' : error.message });
  }
}
