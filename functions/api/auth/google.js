import {error, json, methodNotAllowed, readJson} from '../../_lib/http.js';
import {newExpiry, randomToken, sessionCookie, sha256} from '../../_lib/auth.js';

export async function onRequest(context) {
  const {request, env} = context;
  if (request.method !== 'POST') return methodNotAllowed();
  if (!env.GOOGLE_CLIENT_ID) return error('Google sign-in is not configured.', 503, 'AUTH_NOT_CONFIGURED');
  const body = await readJson(request);
  const credential = body?.credential;
  if (!credential || typeof credential !== 'string') return error('Missing Google credential.', 400, 'INVALID_CREDENTIAL');

  try {
    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!tokenResponse.ok) return error('Google credential could not be verified.', 401, 'INVALID_CREDENTIAL');
    const token = await tokenResponse.json();
    if (token.aud !== env.GOOGLE_CLIENT_ID) return error('Google credential audience is invalid.', 401, 'INVALID_CREDENTIAL');
    if (String(token.email_verified) !== 'true') return error('Google account email is not verified.', 401, 'EMAIL_NOT_VERIFIED');
    if (!token.sub || !token.email) return error('Google credential is incomplete.', 401, 'INVALID_CREDENTIAL');

    const displayName = String(token.name || token.given_name || token.email.split('@')[0]).slice(0, 80);
    const avatarUrl = token.picture ? String(token.picture).slice(0, 500) : null;
    await env.DB.prepare(`
      INSERT INTO users (google_sub, email, display_name, avatar_url, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(google_sub) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = CURRENT_TIMESTAMP
    `).bind(token.sub, token.email, displayName, avatarUrl).run();

    const user = await env.DB.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE google_sub = ? LIMIT 1').bind(token.sub).first();
    if (!user) throw new Error('User upsert failed.');

    const rawToken = randomToken();
    const sessionId = await sha256(rawToken);
    await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, user.id, newExpiry()).run();

    return json({user}, 200, {'set-cookie': sessionCookie(rawToken)});
  } catch (exception) {
    console.error('Google auth failed', exception);
    return error('Sign-in is temporarily unavailable. Please try again.', 500, 'AUTH_FAILED');
  }
}
