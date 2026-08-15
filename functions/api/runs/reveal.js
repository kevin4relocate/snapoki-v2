import {error,json,methodNotAllowed,readJson} from '../../_lib/http.js';
import {requireSession} from '../../_lib/auth.js';

export async function onRequest({request,env}){
  if(request.method!=='POST')return methodNotAllowed();
  const origin=request.headers.get('origin');if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return error('Cross-site practice updates are not allowed.',403,'CROSS_SITE_BLOCKED');
  const session=await requireSession(request,env);if(!session)return error('Sign in to update a ranked attempt.',401,'AUTH_REQUIRED');
  const body=await readJson(request),runId=typeof body?.run_id==='string'?body.run_id.trim():'';if(runId.length<20)return error('Invalid run id.',400,'INVALID_RUN_ID');
  try{
    const attempt=await env.DB.prepare(`SELECT run_id,user_id,game,difficulty,mode,seed,started_at,consumed_at FROM ranked_attempts WHERE run_id=? AND user_id=? LIMIT 1`).bind(runId,session.user.id).first();
    if(!attempt)return error('Ranked attempt not found.',404,'ATTEMPT_NOT_FOUND');
    const existing=await env.DB.prepare(`SELECT solution_used FROM results WHERE run_id=? LIMIT 1`).bind(runId).first();if(existing)return json({practice:true,daily_locked:attempt.mode==='daily',already_recorded:true});
    const now=new Date(),playedDate=now.toISOString().slice(0,10),timeMs=Math.max(0,Date.now()-Date.parse(attempt.started_at||now.toISOString())),metadata=JSON.stringify({seed:attempt.seed,reason:'solution_viewed'});
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO results (run_id,user_id,game,difficulty,mode,score,ranking_points,time_ms,hints_used,solution_used,played_date,metadata_json) VALUES (?,?,?,?,?,0,0,?,0,1,?,?)`).bind(runId,session.user.id,attempt.game,attempt.difficulty,attempt.mode,timeMs,playedDate,metadata),
      env.DB.prepare(`UPDATE ranked_attempts SET consumed_at=? WHERE run_id=? AND user_id=? AND consumed_at IS NULL`).bind(now.toISOString(),runId,session.user.id)
    ]);
    return json({practice:true,daily_locked:attempt.mode==='daily'});
  }catch(exception){console.error('Practice reveal update failed',exception);return error('Practice state could not be saved right now.',500,'PRACTICE_UPDATE_FAILED');}
}
