import { cookies } from 'next/headers';

// Credentials and signing key come from environment variables (Secrets):
//   ADMIN_USER, ADMIN_PASS, SESSION_SECRET
// Uses Web Crypto so it works in both the Edge middleware and Node routes.

const SESSION_DURATION = 5 * 60 * 60 * 1000; // 5 hours
export const COOKIE_NAME = 'panama_admin_session';

const enc = new TextEncoder();

function b64urlEncode(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecodeToString(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmac(data) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function verifyCredentials(username, password) {
  const u = process.env.ADMIN_USER;
  const p = process.env.ADMIN_PASS;
  if (!u || !p) return false; // fail closed if not configured
  return safeEqual(String(username ?? ''), u) && safeEqual(String(password ?? ''), p);
}

export async function createSession() {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const payload = JSON.stringify({
    user: process.env.ADMIN_USER,
    createdAt: Date.now(),
    expiresAt: expiresAt.getTime(),
  });
  const body = b64urlEncode(enc.encode(payload));
  const sig = await hmac(body);
  if (!sig) throw new Error('SESSION_SECRET is not configured (min 16 characters)');
  return { token: `${body}.${sig}`, expiresAt };
}

export async function verifySession(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = await hmac(body);
    if (!expected || !safeEqual(sig, expected)) return null;
    const data = JSON.parse(b64urlDecodeToString(body));
    if (!data.expiresAt || Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  try {
    const store = await cookies();
    const c = store.get(COOKIE_NAME);
    if (!c) return false;
    return (await verifySession(c.value)) !== null;
  } catch {
    return false;
  }
}

export async function getCurrentSession() {
  try {
    const store = await cookies();
    const c = store.get(COOKIE_NAME);
    if (!c) return null;
    return await verifySession(c.value);
  } catch {
    return null;
  }
}

export function setSessionCookie(response, token, expiresAt) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  });
}

export function clearSessionCookie(response) {
  response.cookies.delete(COOKIE_NAME);
}
