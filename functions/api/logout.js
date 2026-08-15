import {json, methodNotAllowed} from '../_lib/http.js';
import {clearSessionCookie, getSession} from '../_lib/auth.js';

export async function onRequest({request, env}) {
  if (request.method !== 'POST') return methodNotAllowed();
  try {
    const session = await getSession(request, env);
    if (session?.sessionId) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.sessionId).run();
  } catch (error) {
    console.warn('Logout cleanup failed', error);
  }
  return json({ok: true}, 200, {'set-cookie': clearSessionCookie()});
}
