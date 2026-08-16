import {getSession} from './auth.js';
import {json} from './http.js';

function adminEmails(env) {
  return String(env.ADMIN_EMAIL || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(request, env) {
  const allowed = adminEmails(env);
  if (!allowed.length) {
    return {ok:false,response:json({error:'ADMIN_EMAIL is not configured.'},503)};
  }
  const session = await getSession(request, env);
  if (!session) {
    return {ok:false,response:json({error:'Sign in to Snapoki first.'},401)};
  }
  const email = String(session.user.email || '').toLowerCase();
  if (!allowed.includes(email)) {
    return {ok:false,response:json({error:'Admin access required.'},403)};
  }
  return {ok:true,session};
}
