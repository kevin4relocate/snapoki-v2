import {error, json, methodNotAllowed, readJson} from '../_lib/http.js';
import {requireSession} from '../_lib/auth.js';
import {rankingPoints, validDifficulty, validGame, validMode} from '../_lib/games.js';
import {verifyAndScoreResult} from '../_lib/scoring.js';

const DAILY_COMPLETE_BONUS=250;
async function rankSnapshot(env,userId,game){
  const row=await env.DB.prepare(`
    WITH totals AS (
      SELECT user_id,COUNT(*) AS games,MAX(score) AS best,SUM(ranking_points) AS ranking_points
      FROM results WHERE game=? AND solution_used=0 GROUP BY user_id
    ), ranked AS (
      SELECT t.user_id,u.display_name,u.avatar_url,t.games,t.best,t.ranking_points,
             ROW_NUMBER() OVER (ORDER BY t.ranking_points DESC,t.games DESC,t.best DESC,t.user_id ASC) AS position
      FROM totals t JOIN users u ON u.id=t.user_id
    ), me AS (SELECT * FROM ranked WHERE user_id=?)
    SELECT me.position,me.ranking_points,me.best,me.games,
           above.user_id AS above_user_id,above.display_name AS above_name,above.avatar_url AS above_avatar,
           above.ranking_points AS above_points
    FROM me LEFT JOIN ranked above ON above.position=me.position-1
  `).bind(game,userId).first();
  if(!row)return null;
  const mine=Number(row.ranking_points||0),above=row.above_user_id?Number(row.above_points||0):null;
  return{position:Number(row.position),ranking_points:mine,best:Number(row.best||0),games:Number(row.games||0),next_target:row.above_user_id?{user_id:Number(row.above_user_id),display_name:row.above_name||'Player',avatar_url:row.above_avatar||null,ranking_points:above,points_to_pass:Math.max(1,above-mine+1)}:null};
}
async function awardDailyCompletionBonus(env,{userId,game,playedDate,resultId}){
  const state=await env.DB.prepare(`
    WITH firsts AS (
      SELECT difficulty,MIN(id) AS first_id
      FROM results
      WHERE user_id=? AND game=? AND mode='daily' AND solution_used=0 AND played_date=?
      GROUP BY difficulty
    )
    SELECT COUNT(*) AS completed,MAX(first_id) AS completion_id FROM firsts
  `).bind(userId,game,playedDate).first();
  if(Number(state?.completed)!==3||Number(state?.completion_id)!==Number(resultId))return 0;
  await env.DB.prepare('UPDATE results SET ranking_points=ranking_points+? WHERE id=?').bind(DAILY_COMPLETE_BONUS,resultId).run();
  return DAILY_COMPLETE_BONUS;
}

export async function onRequest({request, env}) {
  if (request.method !== 'POST') return methodNotAllowed();
  const origin=request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) return error('Cross-site result submission is not allowed.', 403, 'CROSS_SITE_BLOCKED');

  const session = await requireSession(request, env);
  if (!session) return error('Sign in to save ranked results.', 401, 'AUTH_REQUIRED');
  const body = await readJson(request);
  if (!body) return error('Invalid JSON body.', 400, 'INVALID_BODY');

  const runId = typeof body.run_id === 'string' ? body.run_id.trim() : '';
  if (runId.length < 20 || runId.length > 180) return error('Invalid run id.', 400, 'INVALID_RUN_ID');
  if (!validGame(body.game)) return error('Invalid game.', 400, 'INVALID_GAME');
  if (!validDifficulty(body.difficulty)) return error('Invalid difficulty.', 400, 'INVALID_DIFFICULTY');
  if (!validMode(body.mode)) return error('Invalid mode.', 400, 'INVALID_MODE');
  if (body.solution_used) return json({eligible:false, ranking_points:0, reason:'practice'});

  try {
    const existing = await env.DB.prepare('SELECT id,user_id,score,ranking_points FROM results WHERE run_id=? LIMIT 1').bind(runId).first();
    if(existing){
      if(Number(existing.user_id)!==Number(session.user.id))return error('Run id is already in use.',409,'RUN_ID_CONFLICT');
      const snapshot=await rankSnapshot(env,session.user.id,body.game);
      return json({eligible:true,duplicate:true,id:existing.id,score:existing.score,ranking_points:existing.ranking_points,rank_after:snapshot?.position||null,best_score:snapshot?.best||Number(existing.score),next_target:snapshot?.next_target||null});
    }

    const attempt=await env.DB.prepare(`SELECT run_id,user_id,game,difficulty,mode,seed,started_at,expires_at,consumed_at FROM ranked_attempts WHERE run_id=? AND user_id=? LIMIT 1`).bind(runId,session.user.id).first();
    if(!attempt)return error('This ranked attempt was not issued to this account.',409,'ATTEMPT_NOT_FOUND');
    if(attempt.consumed_at)return error('This ranked attempt has already been used.',409,'ATTEMPT_CONSUMED');
    if(Date.parse(attempt.expires_at)<=Date.now())return error('This ranked attempt has expired.',410,'ATTEMPT_EXPIRED');
    if(attempt.game!==body.game||attempt.difficulty!==body.difficulty||attempt.mode!==body.mode)return error('Ranked attempt details do not match.',409,'ATTEMPT_MISMATCH');
    if(!body.metadata||body.metadata.seed!==attempt.seed)return error('Puzzle seed does not match this ranked attempt.',409,'ATTEMPT_SEED_MISMATCH');

    const before=await rankSnapshot(env,session.user.id,body.game),previousBest=Number(before?.best||0);
    const serverTimeMs=Math.max(1000,Date.now()-Date.parse(attempt.started_at));
    const verified=verifyAndScoreResult({game:body.game,difficulty:body.difficulty,mode:body.mode,time_ms:serverTimeMs,hints_used:body.hints_used,metadata:body.metadata});
    if(!verified.ok)return error('This result could not be verified as a valid ranked finish.',422,verified.reason||'RESULT_NOT_VERIFIED');

    const score=verified.score,timeMs=verified.timeMs,hints=verified.hints,basePoints=rankingPoints({difficulty:body.difficulty,mode:body.mode,score,hints});
    const playedDate=new Date().toISOString().slice(0,10),metadata=JSON.stringify({...verified.metadata,seed:attempt.seed}).slice(0,8000),consumedAt=new Date().toISOString();
    const insert=env.DB.prepare(`INSERT INTO results (run_id,user_id,game,difficulty,mode,score,ranking_points,time_ms,hints_used,solution_used,played_date,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`).bind(runId,session.user.id,body.game,body.difficulty,body.mode,score,basePoints,timeMs,hints,playedDate,metadata);
    const consume=env.DB.prepare(`UPDATE ranked_attempts SET consumed_at=? WHERE run_id=? AND user_id=? AND consumed_at IS NULL`).bind(consumedAt,runId,session.user.id);
    const [saved]=await env.DB.batch([insert,consume]),resultId=Number(saved?.meta?.last_row_id||0);
    const dailyBonus=body.mode==='daily'&&resultId?await awardDailyCompletionBonus(env,{userId:session.user.id,game:body.game,playedDate,resultId}):0;
    const points=basePoints+dailyBonus,after=await rankSnapshot(env,session.user.id,body.game),bestScore=Number(after?.best||score);
    return json({eligible:true,duplicate:false,id:resultId||null,score,ranking_points:points,base_ranking_points:basePoints,daily_complete_bonus:dailyBonus,verified:true,time_ms:timeMs,previous_best:previousBest,best_score:bestScore,new_personal_best:score>previousBest,rank_before:before?.position||null,rank_after:after?.position||null,rank_change:before?.position&&after?.position?Number(before.position)-Number(after.position):0,next_target:after?.next_target||null});
  } catch (exception) {
    console.error('Result save failed', exception);
    return error('Ranked result could not be saved right now.', 500, 'RESULT_SAVE_FAILED');
  }
}
