import { database, sql } from './database.mjs';
import { clientToken, csrfFor, digest, equal, sign, requestOrigin, publicBase } from './security.mjs';
import { securityHeaders } from './application.mjs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const json = (res, status, value) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
};

function parseRole(token) {
  const parts = String(token || '').split('.');
  if (parts.length === 1) return 'admin';
  if (parts.length !== 3) return '';
  const [nonce, payload, signature] = parts;
  if (!nonce || !payload || !equal(signature, sign(`session:${nonce}.${payload}`))) return '';
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.role === 'admin' ? 'admin' : '';
  } catch { return ''; }
}

function guardOrigin(req) {
  const origin = req.headers.origin;
  if (origin && ![requestOrigin(req), publicBase(req)].includes(origin)) fail(403, 'So‘rov manzili tasdiqlanmadi.');
  if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'So‘rov manzili tasdiqlanmadi.');
}

export default async function adminFeedbackDelete(req, res) {
  securityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'DELETE') fail(405, 'Bu amal qo‘llab-quvvatlanmaydi.');
    guardOrigin(req);
    const token = clientToken(req);
    if (!token || token.length > 512) fail(401, 'Tizimga qayta kiring.');
    if (!equal(req.headers['x-csrf-token'], csrfFor(token))) fail(403, 'Sahifani yangilab, qayta urinib ko‘ring.');

    const db = await database();
    const [session] = await db.all(sql`SELECT token_hash FROM admin_sessions WHERE token_hash=${digest(token)} AND expires_at>${new Date().toISOString()}`);
    if (!session || parseRole(token) !== 'admin') fail(403, 'Fikrlarni faqat admin o‘chira oladi.');

    const url = new URL(req.url, requestOrigin(req));
    const match = url.pathname.match(/^\/api\/admin\/feedback\/([^/]+)\/?$/);
    const id = match ? decodeURIComponent(match[1]) : '';
    if (!uuidPattern.test(id)) fail(400, 'Fikr identifikatori noto‘g‘ri.');

    const rows = await db.all(sql`DELETE FROM feedbacks WHERE id=${id} RETURNING id`);
    if (!rows.length) fail(404, 'Fikr topilmadi yoki avval o‘chirilgan.');
    return json(res, 200, { ok: true, id, message: 'Fikr o‘chirildi.' });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error(error);
    return json(res, status, { error: status >= 500 ? 'Server bilan bog‘lanishda xatolik.' : error.message });
  }
}
