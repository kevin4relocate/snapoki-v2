import {error,json,methodNotAllowed,readJson} from '../../_lib/http.js';
import {requireSession} from '../../_lib/auth.js';

export async function onRequest({request,env}){
  if(request.method!=='POST')return methodNotAllowed();
  const origin=request.headers.get('origin');
  if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return error('Cross-site Hint updates are not allowed.',403,'CROSS_SITE_BLOCKED');
  const session=await requireSession(request,env);
  if(!session)return error('Sign in to update a verified attempt.',401,'AUTH_REQUIRED');
  const body=await readJson(request),runId=typeof body?.run_id==='string'?body.run_id.trim():'';
  if(runId.length<20||runId.length>180)return error('Invalid run id.',400,'INVALID_RUN_ID');
  try{
    const attempt=await env.DB.prepare(`
      SELECT hint_count,solution_revealed,completed_at,consumed_at,expires_at
      FROM ranked_attempts
      WHERE run_id=? AND user_id=?
      LIMIT 1
    `).bind(runId,session.user.id).first();
    if(!attempt)return error('Verified attempt not found.',404,'ATTEMPT_NOT_FOUND');
    if(attempt.completed_at||attempt.consumed_at)return error('This attempt is no longer active.',409,'ATTEMPT_INACTIVE');
    if(Number(attempt.solution_revealed)===1)return error('This attempt is practice-only.',409,'ATTEMPT_PRACTICE');
    if(Date.parse(attempt.expires_at)<=Date.now())return error('This attempt has expired.',410,'ATTEMPT_EXPIRED');
    const current=Math.max(0,Number(attempt.hint_count||0));
    if(current>=99)return error('Hint limit reached.',409,'HINT_LIMIT');
    await env.DB.prepare(`UPDATE ranked_attempts SET hint_count=hint_count+1 WHERE run_id=? AND user_id=? AND completed_at IS NULL AND consumed_at IS NULL`).bind(runId,session.user.id).run();
    return json({hints_used:current+1});
  }catch(exception){
    console.error('Hint update failed',exception);
    return error('Hint usage could not be verified right now.',500,'HINT_UPDATE_FAILED');
  }
}
