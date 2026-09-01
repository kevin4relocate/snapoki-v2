import {error,json,methodNotAllowed,readJson} from '../../_lib/http.js';
import {requireSession,randomToken} from '../../_lib/auth.js';
import {validGame,validGameDifficulty,validGameMode,difficultyMultiplier} from '../../_lib/games.js';
import {expectedDailySeed} from '../../_lib/scoring.js';
import {dailyBit} from '../../_lib/progression.js';
import {seedFamily} from '../../../src/js/games/utils.js';

const ATTEMPT_SECONDS=60*60*4;
const MIN_SLOT_RESTART_MS=350;

async function previousRunState(env,userId,runId){
  return env.DB.prepare(`
    SELECT run_id,seed,game,difficulty,mode,solution_revealed,completed_at,consumed_at,started_at,expires_at,hint_count
    FROM ranked_attempts
    WHERE run_id=? AND user_id=?
    LIMIT 1
  `).bind(runId,userId).first();
}

async function dailyWasBlocked(env,userId,game,difficulty,today){
  const row=await env.DB.prepare(`
    SELECT daily_date,daily_blocked_mask
    FROM user_game_stats
    WHERE user_id=? AND game=?
    LIMIT 1
  `).bind(userId,game).first();
  return row?.daily_date===today&&(Number(row.daily_blocked_mask||0)&dailyBit(difficulty))!==0;
}

async function slotState(env,userId,game,difficulty,mode){
  return env.DB.prepare(`
    SELECT seed,created_at
    FROM ranked_attempts
    WHERE user_id=? AND game=? AND difficulty=? AND mode=?
    LIMIT 1
  `).bind(userId,game,difficulty,mode).first();
}

function freshSeed(game,difficulty,previousSeed=''){
  const priorFamily=previousSeed?seedFamily(previousSeed):'';
  for(let i=0;i<8;i++){
    const seed=`${game}:${difficulty}:v3:${randomToken()}`;
    if(!priorFamily||seedFamily(seed)!==priorFamily)return seed;
  }
  return `${game}:${difficulty}:v3:${randomToken()}`;
}

export async function onRequest({request,env}){
  if(request.method!=='POST')return methodNotAllowed();
  const origin=request.headers.get('origin');
  if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return error('Cross-site attempt creation is not allowed.',403,'CROSS_SITE_BLOCKED');
  const session=await requireSession(request,env);
  if(!session)return error('Sign in to start a verified attempt.',401,'AUTH_REQUIRED');
  const body=await readJson(request);
  if(!body)return error('Invalid JSON body.',400,'INVALID_BODY');
  const game=typeof body.game==='string'?body.game:'',difficulty=typeof body.difficulty==='string'?body.difficulty:'',mode=typeof body.mode==='string'?body.mode:'';
  if(!validGame(game))return error('Invalid game.',400,'INVALID_GAME');
  if(!validGameDifficulty(game,difficulty))return error('Invalid difficulty for this game.',400,'INVALID_DIFFICULTY');
  if(!validGameMode(game,mode))return error('This mode is not available for this game.',400,'INVALID_MODE');

  const now=new Date(),today=now.toISOString().slice(0,10),startedAt=now.toISOString(),expiresAt=new Date(now.getTime()+ATTEMPT_SECONDS*1000).toISOString();
  const runId=`run_${randomToken()}`,cloneRunId=typeof body.clone_run_id==='string'?body.clone_run_id.trim():'';
  let seed='';
  try{
    if(cloneRunId){
      const previous=await previousRunState(env,session.user.id,cloneRunId);
      if(!previous||previous.game!==game||previous.difficulty!==difficulty||previous.mode!==mode)return error('The previous verified attempt cannot be replayed.',409,'ATTEMPT_CLONE_INVALID');
      seed=previous.seed;
      if(Number(previous.solution_revealed)===1)return json({seed,ranked:false,reason:'solution_viewed',reward_multiplier:mode==='normal'?difficultyMultiplier(difficulty):0});
      if(previous.completed_at||previous.consumed_at)return json({seed,ranked:false,reason:'recent_replay',reward_multiplier:mode==='normal'?difficultyMultiplier(difficulty):0});
      if(Date.parse(previous.expires_at)<=Date.now())return json({seed,ranked:false,reason:'attempt_expired',reward_multiplier:mode==='normal'?difficultyMultiplier(difficulty):0});
      if(Number(previous.hint_count||0)>0)return json({seed,ranked:false,reason:'hinted_reset',reward_multiplier:mode==='normal'?difficultyMultiplier(difficulty):0});
      return json({
        run_id:previous.run_id,
        seed,
        started_at:previous.started_at,
        expires_at:previous.expires_at,
        ranked:true,
        hints_used:0,
        reward_multiplier:mode==='normal'?difficultyMultiplier(difficulty):0
      });
    }else if(mode==='daily'){
      seed=expectedDailySeed(game,difficulty,now);
      if(await dailyWasBlocked(env,session.user.id,game,difficulty,today))return json({seed,ranked:false,reason:'daily_solution_viewed',reward_multiplier:0});
    }else{
      const current=await slotState(env,session.user.id,game,difficulty,mode);
      const created=Date.parse(current?.created_at||'');
      if(Number.isFinite(created)&&Date.now()-created<MIN_SLOT_RESTART_MS)return error('Please wait a moment before starting another puzzle.',429,'ATTEMPT_RATE_LIMIT');
      seed=freshSeed(game,difficulty,current?.seed||'');
    }

    await env.DB.prepare(`
      INSERT INTO ranked_attempts (
        run_id,user_id,game,difficulty,mode,seed,started_at,expires_at,consumed_at,created_at,
        solution_revealed,hint_count,completed_score,completed_rank_score,completed_time_ms,completed_at
      ) VALUES (?,?,?,?,?,?,?,?,NULL,?,0,0,NULL,NULL,NULL,NULL)
      ON CONFLICT(user_id,game,difficulty,mode) DO UPDATE SET
        run_id=excluded.run_id,
        seed=excluded.seed,
        started_at=excluded.started_at,
        expires_at=excluded.expires_at,
        consumed_at=NULL,
        created_at=excluded.created_at,
        solution_revealed=0,
        hint_count=0,
        completed_score=NULL,
        completed_rank_score=NULL,
        completed_time_ms=NULL,
        completed_at=NULL
    `).bind(runId,session.user.id,game,difficulty,mode,seed,startedAt,expiresAt,startedAt).run();

    return json({
      run_id:runId,
      seed,
      started_at:startedAt,
      expires_at:expiresAt,
      ranked:true,
      hints_used:0,
      reward_multiplier:mode==='normal'?difficultyMultiplier(difficulty):0
    });
  }catch(exception){
    console.error('Verified attempt creation failed',exception);
    return error('A verified attempt could not be started right now.',500,'ATTEMPT_START_FAILED');
  }
}
