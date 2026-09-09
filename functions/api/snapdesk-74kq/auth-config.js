import {json,methodNotAllowed} from '../../_lib/http.js';

export async function onRequest({request,env}) {
  if(request.method!=='GET')return methodNotAllowed();
  const adminConfigured=String(env.ADMIN_EMAIL||'').split(',').some(value=>value.trim());
  const googleClientId=String(env.GOOGLE_CLIENT_ID||'').trim();
  return json({enabled:Boolean(adminConfigured&&googleClientId),googleClientId});
}
