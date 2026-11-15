import {json, methodNotAllowed} from '../_lib/http.js';
import {clearSessionCookie, getSession} from '../_lib/auth.js';

export async function onRequest({request, env}) {
  if (request.method !== 'POST') return methodNotAllowed();
  // Prevent third-party pages from signing an admin out via a forged POST.
  if(request.headers.get('origin')!==new URL(request.url).origin || ['cross-site','same-site'].includes(request.headers.get('sec-fetch-site')))
    return json({error:'Cross-site sign-out is not allowed.',code:'CROSS_SITE_BLOCKED'},403);
  try {
    const session = await getSession(request, env);
    if (session?.sessionId) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.sessionId).run();
  } catch (error) {
    console.warn('Logout cleanup failed', error);
  }
  return json({ok: true}, 200, {'set-cookie': clearSessionCookie()});
}
