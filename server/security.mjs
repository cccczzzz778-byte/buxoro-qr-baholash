import { randomBytes, createHash, createHmac, timingSafeEqual, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
const deriveKey = promisify(scrypt);
export const randomToken = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export function equal(a, b) {
  const left = Buffer.from(String(a || '')), right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}
export function secret() {
  if ((process.env.SESSION_SECRET || '').length < 32) throw new Error('Set SESSION_SECRET (at least 32 characters).');
  return process.env.SESSION_SECRET;
}
export const sign = value => createHmac('sha256', secret()).update(value).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [type, salt, hash] = String(stored).split(':');
  if (type !== 'scrypt' || !salt || !hash) return false;
  const derived = await deriveKey(password, salt, 64);
  return equal(derived.toString('hex'), hash);
}
export function clientToken(req) {
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('buxoro_qr_session='))?.split('=')[1] || '';
}
export const csrfFor = token => sign(`csrf:${token}`);
export function requestOrigin(req) {
  const host = req.headers.host || 'localhost:3000';
  if (!/^[a-zA-Z0-9.:[\]-]+$/.test(host)) throw new Error('Invalid host');
  const https = process.env.VERCEL || req.socket?.encrypted || req.headers['x-forwarded-proto'] === 'https';
  return `${https ? 'https' : 'http'}://${host}`;
}
export function publicBase(req) {
  // QR-kodlar Railway'dagi yangi rasmiy domen bilan yaratiladi.
  // Eski PUBLIC_BASE_URL qiymati mavjud bo‘lsa ham eski domen QR ichiga qaytib qolmaydi.
  return 'https://qr-baholash.up.railway.app';
}
export function cookie(req, token, seconds) {
  const secure = requestOrigin(req).startsWith('https:') ? '; Secure' : '';
  return `buxoro_qr_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${secure}`;
}
