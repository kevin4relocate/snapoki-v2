import {error,json,methodNotAllowed,readJson} from '../../_lib/http.js';
import {requireSession} from '../../_lib/auth.js';
import {dailyBit} from '../../_lib/progression.js';

export async function onRequest({request,env}){
  if(request.method!=='POST')return methodNotAllowed();
  const origin=request.headers.get('origin');
  if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return error('Cross-site practice updates are not allowed.',403,'CROSS_SITE_BLOCKED');
  const session=await requireSession(request,env);
  if(!session)return error('Sign in to update a verified attempt.',401,'AUTH_REQUIRED');
  const body=await readJson(request),runId=typeof body?.run_id==='string'?body.run_id.trim():'';
  if(runId.length<20)return error('Invalid run id.',400,'INVALID_RUN_ID');
  try{
    const attempt=await env.DB.prepare(`
      SELECT run_id,user_id,game,difficulty,mode,seed,started_at,consumed_at,solution_revealed,completed_at
      FROM ranked_attempts
      WHERE run_id=? AND user_id=?
      LIMIT 1
    `).bind(runId,session.user.id).first();
    if(!attempt)return error('Verified attempt not found.',404,'ATTEMPT_NOT_FOUND');
    if(Number(attempt.solution_revealed)===1)return json({practice:true,daily_locked:attempt.mode==='daily',already_recorded:true});
    if(attempt.completed_at)return json({practice:false,daily_locked:false,already_recorded:true,already_completed:true});

    const now=new Date(),timestamp=now.toISOString(),today=timestamp.slice(0,10),operations=[];
    if(attempt.mode==='daily'){
      const bit=dailyBit(attempt.difficulty);
      operations.push(
        env.DB.prepare(`INSERT OR IGNORE INTO user_game_stats (user_id,game) VALUES (?,?)`).bind(session.user.id,attempt.game),
        env.DB.prepare(`
          UPDATE user_game_stats
          SET daily_blocked_mask=CASE WHEN daily_date=? THEN (daily_blocked_mask | ?) ELSE ? END,
              daily_complete_mask=CASE WHEN daily_date=? THEN daily_complete_mask ELSE 0 END,
              daily_date=?,
              updated_at=?
          WHERE user_id=? AND game=?
        `).bind(today,bit,bit,today,today,timestamp,session.user.id,attempt.game)
      );
    }
    operations.push(env.DB.prepare(`
      UPDATE ranked_attempts
      SET solution_revealed=1,consumed_at=?
      WHERE run_id=? AND user_id=? AND completed_at IS NULL
    `).bind(timestamp,runId,session.user.id));
    await env.DB.batch(operations);
    return json({practice:true,daily_locked:attempt.mode==='daily'});
  }catch(exception){
    console.error('Practice reveal update failed',exception);
    return error('Practice state could not be saved right now.',500,'PRACTICE_UPDATE_FAILED');
  }
}
