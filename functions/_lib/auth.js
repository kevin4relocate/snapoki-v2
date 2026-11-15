import {compactPublicName} from './public-name.js';

const COOKIE = 'snapoki_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(header = '') {
  const out = Object.create(null);
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key=part.slice(0,index).trim();
    if(!key||Object.hasOwn(out,key))continue;
    try{out[key]=decodeURIComponent(part.slice(index+1).trim());}catch{/* Malformed cookie must not break admin auth. */}
  }
  return out;
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function sessionCookie(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function getSession(request, env) {
  const token = parseCookies(request.headers.get('cookie') || '')[COOKIE];
  // Admin-issued tokens contain 32 bytes encoded as 43 base64url characters.
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const id = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT s.id AS session_id, s.expires_at,
           u.id, u.email, u.display_name, u.avatar_url
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
    LIMIT 1
  `).bind(id).first();
  if (!row) return null;
  return {
    sessionId: row.session_id,
    user: {
      id: row.id,
      email: row.email,
      display_name: compactPublicName(row.display_name),
      avatar_url: row.avatar_url
    }
  };
}

export async function requireSession(request, env) {
  return await getSession(request, env);
}

export function newExpiry() {
  return new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
}
