import {json} from '../_lib/http.js';

export async function onRequestGet({env}) {
  return json({googleClientId: env.GOOGLE_CLIENT_ID || ''});
}
