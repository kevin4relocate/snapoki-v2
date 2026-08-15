import {json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';

export async function onRequestGet({request, env}) {
  try {
    const session = await getSession(request, env);
    return json({user: session?.user || null});
  } catch (error) {
    console.error('me failed', error);
    return json({user: null});
  }
}
