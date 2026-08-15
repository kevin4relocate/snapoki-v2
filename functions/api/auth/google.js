import {error, json, methodNotAllowed, readJson} from '../../_lib/http.js';
import {newExpiry, randomToken, sessionCookie, sha256} from '../../_lib/auth.js';
import {compactPublicName} from '../../_lib/public-name.js';

function publicFirstName(token) {
  const given = String(token?.given_name || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
  const fallback = String(token?.email || '').split('@')[0].replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return compactPublicName(given || fallback || 'Player');
}

export async function onRequest(context) {
  const {request, env} = context;
  if (request.method !== 'POST') return methodNotAllowed();
  if (request.headers.get('sec-fetch-site') === 'cross-site') return error('Cross-site sign-in is not allowed.', 403, 'CROSS_SITE_BLOCKED');
  if (!env.GOOGLE_CLIENT_ID) return error('Google sign-in is not configured.', 503, 'AUTH_NOT_CONFIGURED');
  const body = await readJson(request);
  const credential = body?.credential;
  if (!credential || typeof credential !== 'string' || credential.length > 10000) return error('Missing or invalid Google credential.', 400, 'INVALID_CREDENTIAL');

  try {
    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!tokenResponse.ok) return error('Google credential could not be verified.', 401, 'INVALID_CREDENTIAL');
    const token = await tokenResponse.json();
    const issuer = String(token.iss || '');
    const expiresAt = Number(token.exp || 0) * 1000;
    if (token.aud !== env.GOOGLE_CLIENT_ID) return error('Google credential audience is invalid.', 401, 'INVALID_CREDENTIAL');
    if (!['accounts.google.com','https://accounts.google.com'].includes(issuer)) return error('Google credential issuer is invalid.', 401, 'INVALID_CREDENTIAL');
    if (!expiresAt || expiresAt <= Date.now() - 30000) return error('Google credential has expired.', 401, 'INVALID_CREDENTIAL');
    if (String(token.email_verified) !== 'true') return error('Google account email is not verified.', 401, 'EMAIL_NOT_VERIFIED');
    if (!token.sub || !token.email) return error('Google credential is incomplete.', 401, 'INVALID_CREDENTIAL');

    // Snapoki public identity intentionally uses Google's given_name only.
    // Full Google profile names are never stored as the public display name.
    const displayName = publicFirstName(token);
    const avatarUrl = token.picture ? String(token.picture).slice(0, 500) : null;
    await env.DB.prepare(`
      INSERT INTO users (google_sub, email, display_name, avatar_url, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(google_sub) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = CURRENT_TIMESTAMP
    `).bind(String(token.sub).slice(0,200), String(token.email).slice(0,254), displayName, avatarUrl).run();

    const user = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE google_sub = ? LIMIT 1').bind(token.sub).first();
    if (!user) throw new Error('User upsert failed.');

    await env.DB.prepare("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')").run();
    const rawToken = randomToken();
    const sessionId = await sha256(rawToken);
    await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, user.id, newExpiry()).run();
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND id NOT IN (SELECT id FROM sessions WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 8)`).bind(user.id, user.id).run();

    return json({user}, 200, {'set-cookie': sessionCookie(rawToken)});
  } catch (exception) {
    console.error('Google auth failed', exception);
    return error('Sign-in is temporarily unavailable. Please try again.', 500, 'AUTH_FAILED');
  }
}
