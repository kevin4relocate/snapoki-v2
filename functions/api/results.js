import {error,json,methodNotAllowed,readJson} from '../_lib/http.js';
import {requireSession} from '../_lib/auth.js';
import {rankingPoints,validGame,validGameDifficulty,validGameMode,difficultyMultiplier} from '../_lib/games.js';
import {verifyAndScoreResult} from '../_lib/scoring.js';
import {anomalyAssessment,crossedMilestone,chooseSmartNext} from '../_lib/ranking-policy.js';
import {dailyBit,dailyProgressFromRow,isBetterPerformance,masteryFromRow,progressionXp} from '../_lib/progression.js';
import {fetchGameStats,rankSnapshot} from '../_lib/player-stats.js';

const COLUMNS=Object.freeze({
  easy:{rank:'easy_rank_score',score:'easy_best_score',time:'easy_best_time_ms',achieved:'easy_achieved_at',clears:'easy_clears'},
  medium:{rank:'medium_rank_score',score:'medium_best_score',time:'medium_best_time_ms',achieved:'medium_achieved_at',clears:'medium_clears'},
  hard:{rank:'hard_rank_score',score:'hard_best_score',time:'hard_best_time_ms',achieved:'hard_achieved_at',clears:'hard_clears'}
});

function betterBinds(rankScore,score,timeMs){return[rankScore,rankScore,score,rankScore,score,timeMs];}
function dailyPayload(row,today){
  const daily=dailyProgressFromRow(row,today);
  return{
    daily_completed:daily.completed,
    daily_remaining:Math.max(0,3-daily.completed.length),
    daily_complete:daily.mask===7,
    streak:daily.streak,
    longest_streak:daily.longestStreak,
    mastery:masteryFromRow(row||{})
  };
}
function ensureStats(env,userId,game){return env.DB.prepare('INSERT OR IGNORE INTO user_game_stats (user_id,game) VALUES (?,?)').bind(userId,game);}
function dailyDateFromSeed(seed,game,difficulty){const match=String(seed||'').match(new RegExp(`^${game}:(\\d{4}-\\d{2}-\\d{2}):${difficulty}$`));return match?.[1]||'';}
function hourBucket(date=new Date()){return date.toISOString().slice(0,13);}

async function recentHourlyFinishes(env,userId,bucket){
  const row=await env.DB.prepare('SELECT ranked_hour_bucket,ranked_hour_count FROM users WHERE id=? LIMIT 1').bind(userId).first();
  return row?.ranked_hour_bucket===bucket?Math.max(0,Number(row.ranked_hour_count||0)):0;
}
function incrementHourlyFinishes(env,userId,bucket){
  return env.DB.prepare(`UPDATE users SET ranked_hour_count=CASE WHEN ranked_hour_bucket=? THEN ranked_hour_count+1 ELSE 1 END,ranked_hour_bucket=? WHERE id=?`).bind(bucket,bucket,userId);
}

function regularUpdate(env,{userId,game,difficulty,rankScore,score,timeMs,xpGain,achievedAt,runId}){
  const c=COLUMNS[difficulty];
  const diffCondition=`(? > ${c.rank} OR (? = ${c.rank} AND ? > ${c.score}) OR (? = ${c.rank} AND ? = ${c.score} AND ? < COALESCE(${c.time},9223372036854775807)))`;
  const overallCondition=`(? > overall_rank_score OR (? = overall_rank_score AND ? > overall_best_score) OR (? = overall_rank_score AND ? = overall_best_score AND ? < COALESCE(overall_best_time_ms,9223372036854775807)))`;
  return env.DB.prepare(`
    UPDATE user_game_stats
    SET games_completed=games_completed+1,
        ${c.clears}=${c.clears}+1,
        xp=xp+?,
        ${c.rank}=CASE WHEN ${diffCondition} THEN ? ELSE ${c.rank} END,
        ${c.score}=CASE WHEN ${diffCondition} THEN ? ELSE ${c.score} END,
        ${c.time}=CASE WHEN ${diffCondition} THEN ? ELSE ${c.time} END,
        ${c.achieved}=CASE WHEN ${diffCondition} THEN ? ELSE ${c.achieved} END,
        overall_rank_score=CASE WHEN ${overallCondition} THEN ? ELSE overall_rank_score END,
        overall_best_score=CASE WHEN ${overallCondition} THEN ? ELSE overall_best_score END,
        overall_best_time_ms=CASE WHEN ${overallCondition} THEN ? ELSE overall_best_time_ms END,
        overall_best_difficulty=CASE WHEN ${overallCondition} THEN ? ELSE overall_best_difficulty END,
        overall_achieved_at=CASE WHEN ${overallCondition} THEN ? ELSE overall_achieved_at END,
        updated_at=?
    WHERE user_id=? AND game=?
      AND EXISTS (SELECT 1 FROM ranked_attempts WHERE run_id=? AND user_id=? AND consumed_at IS NULL)
  `).bind(
    xpGain,
    ...betterBinds(rankScore,score,timeMs),rankScore,
    ...betterBinds(rankScore,score,timeMs),score,
    ...betterBinds(rankScore,score,timeMs),timeMs,
    ...betterBinds(rankScore,score,timeMs),achievedAt,
    ...betterBinds(rankScore,score,timeMs),rankScore,
    ...betterBinds(rankScore,score,timeMs),score,
    ...betterBinds(rankScore,score,timeMs),timeMs,
    ...betterBinds(rankScore,score,timeMs),difficulty,
    ...betterBinds(rankScore,score,timeMs),achievedAt,
    achievedAt,userId,game,runId,userId
  );
}

function dailyUpdate(env,{userId,game,difficulty,today,runId,updatedAt}){
  const bit=dailyBit(difficulty);
  return env.DB.prepare(`
    UPDATE user_game_stats
    SET daily_complete_mask=CASE WHEN daily_date=? THEN (daily_complete_mask | ?) ELSE ? END,
        daily_blocked_mask=CASE WHEN daily_date=? THEN daily_blocked_mask ELSE 0 END,
        daily_date=?,
        updated_at=?
    WHERE user_id=? AND game=?
      AND EXISTS (SELECT 1 FROM ranked_attempts WHERE run_id=? AND user_id=? AND consumed_at IS NULL)
  `).bind(today,bit,bit,today,today,updatedAt,userId,game,runId,userId);
}

function dailyStreakUpdate(env,userId,game,today,updatedAt){
  const yesterday=new Date(`${today}T00:00:00Z`);yesterday.setUTCDate(yesterday.getUTCDate()-1);
  const previous=yesterday.toISOString().slice(0,10);
  return env.DB.prepare(`
    UPDATE user_game_stats
    SET daily_streak=CASE WHEN last_daily_complete_date=? THEN daily_streak+1 ELSE 1 END,
        longest_daily_streak=MAX(longest_daily_streak,CASE WHEN last_daily_complete_date=? THEN daily_streak+1 ELSE 1 END),
        last_daily_complete_date=?,
        updated_at=?
    WHERE user_id=? AND game=? AND daily_date=? AND daily_complete_mask=7
      AND COALESCE(last_daily_complete_date,'')<>?
  `).bind(previous,previous,today,updatedAt,userId,game,today,today);
}

async function duplicateResponse(env,{attempt,userId,game,today}){
  const stats=await fetchGameStats(env,userId,game);
  const snapshot=attempt.mode==='normal'?await rankSnapshot(env,userId,game,'overall'):null;
  return{
    eligible:attempt.mode==='normal'&&Number(attempt.completed_rank_score||0)>0,
    duplicate:true,
    score:Number(attempt.completed_score||0),
    ranking_points:0,
    ranking_gain:0,
    ranking_score:Number(stats?.overall_rank_score||0),
    rank_after:snapshot?.position||null,
    best_score:Number(stats?.overall_best_score||0),
    next_target:snapshot?.next_target||null,
    verified:true,
    time_ms:Number(attempt.completed_time_ms||0),
    xp_gain:0,
    ...dailyPayload(stats,today)
  };
}

export async function onRequest({request,env}){
  if(request.method!=='POST')return methodNotAllowed();
  const origin=request.headers.get('origin');
  if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return error('Cross-site result submission is not allowed.',403,'CROSS_SITE_BLOCKED');
  const session=await requireSession(request,env);
  if(!session)return error('Sign in to save verified progress.',401,'AUTH_REQUIRED');
  const body=await readJson(request);
  if(!body)return error('Invalid JSON body.',400,'INVALID_BODY');
  const runId=typeof body.run_id==='string'?body.run_id.trim():'';
  if(runId.length<20||runId.length>180)return error('Invalid run id.',400,'INVALID_RUN_ID');
  if(!validGame(body.game))return error('Invalid game.',400,'INVALID_GAME');
  if(!validGameDifficulty(body.game,body.difficulty))return error('Invalid difficulty for this game.',400,'INVALID_DIFFICULTY');
  if(!validGameMode(body.game,body.mode))return error('This mode is not available for this game.',400,'INVALID_MODE');
  if(body.solution_used)return json({eligible:false,ranking_points:0,reason:'practice'});

  try{
    const attempt=await env.DB.prepare(`
      SELECT run_id,user_id,game,difficulty,mode,seed,started_at,expires_at,consumed_at,
             solution_revealed,hint_count,completed_score,completed_rank_score,completed_time_ms,completed_at
      FROM ranked_attempts
      WHERE run_id=? AND user_id=?
      LIMIT 1
    `).bind(runId,session.user.id).first();
    if(!attempt)return error('This verified attempt is no longer active. Start a New Puzzle.',409,'ATTEMPT_NOT_FOUND');
    const currentDate=new Date().toISOString().slice(0,10);
    const dailyDate=attempt.mode==='daily'?dailyDateFromSeed(attempt.seed,attempt.game,attempt.difficulty):currentDate;
    const progressDate=dailyDate||currentDate;
    if(attempt.game!==body.game||attempt.difficulty!==body.difficulty||attempt.mode!==body.mode)return error('Attempt details do not match.',409,'ATTEMPT_MISMATCH');
    if(attempt.completed_at)return json(await duplicateResponse(env,{attempt,userId:session.user.id,game:body.game,today:progressDate}));
    if(Number(attempt.solution_revealed)===1)return json({eligible:false,duplicate:true,ranking_points:0,reason:'practice'});
    if(attempt.consumed_at)return error('This attempt has already been used.',409,'ATTEMPT_CONSUMED');
    if(Date.parse(attempt.expires_at)<=Date.now())return error('This attempt has expired.',410,'ATTEMPT_EXPIRED');
    if(!body.metadata||body.metadata.seed!==attempt.seed)return error('Puzzle seed does not match this attempt.',409,'ATTEMPT_SEED_MISMATCH');

    const beforeStats=await fetchGameStats(env,session.user.id,body.game);
    const beforeDaily=dailyProgressFromRow(beforeStats,progressDate);
    const repeatDaily=body.mode==='daily'&&beforeDaily.completed.includes(body.difficulty);
    const beforeRank=body.mode==='normal'?await rankSnapshot(env,session.user.id,body.game,'overall'):null;
    const serverTimeMs=Math.max(1000,Date.now()-Date.parse(attempt.started_at));
    const serverHints=Math.max(0,Number(attempt.hint_count||0));
    const verified=verifyAndScoreResult({game:body.game,difficulty:body.difficulty,mode:body.mode,time_ms:serverTimeMs,hints_used:serverHints,metadata:body.metadata,expected_seed:attempt.seed});
    if(!verified.ok)return error('This result could not be verified as a valid finish.',422,verified.reason||'RESULT_NOT_VERIFIED');

    const score=verified.score,timeMs=verified.timeMs,hints=verified.hints;
    const candidateRankScore=body.mode==='normal'?rankingPoints({difficulty:body.difficulty,mode:'normal',score,hints}):0;
    const bucket=hourBucket(),recent=await recentHourlyFinishes(env,session.user.id,bucket);
    const anomaly=anomalyAssessment({game:body.game,difficulty:body.difficulty,timeMs,score,recentHourlyFinishes:recent+1});
    const eligible=!anomaly.suspicious;
    const xpGain=eligible&&body.mode==='normal'?progressionXp({difficulty:body.difficulty,score,hints}):0;
    const now=new Date().toISOString();
    const operations=[ensureStats(env,session.user.id,body.game)];

    if(eligible){
      if(body.mode==='normal')operations.push(regularUpdate(env,{userId:session.user.id,game:body.game,difficulty:body.difficulty,rankScore:candidateRankScore,score,timeMs,xpGain,achievedAt:now,runId}));
      else{
        operations.push(dailyUpdate(env,{userId:session.user.id,game:body.game,difficulty:body.difficulty,today:progressDate,runId,updatedAt:now}));
        operations.push(dailyStreakUpdate(env,session.user.id,body.game,progressDate,now));
      }
    }
    operations.push(incrementHourlyFinishes(env,session.user.id,bucket));
    operations.push(env.DB.prepare(`
      UPDATE ranked_attempts
      SET consumed_at=?,completed_score=?,completed_rank_score=?,completed_time_ms=?,completed_at=?
      WHERE run_id=? AND user_id=? AND consumed_at IS NULL
    `).bind(now,score,eligible?candidateRankScore:0,timeMs,now,runId,session.user.id));

    await env.DB.batch(operations);

    const afterStats=await fetchGameStats(env,session.user.id,body.game);
    const afterRank=body.mode==='normal'?await rankSnapshot(env,session.user.id,body.game,'overall'):null;
    const progress=dailyPayload(afterStats,progressDate);
    const beforeOverall=Number(beforeStats?.overall_rank_score||0),afterOverall=Number(afterStats?.overall_rank_score||0);
    const newPersonalBest=eligible&&body.mode==='normal'&&isBetterPerformance(
      {rankScore:candidateRankScore,score,timeMs},
      {rankScore:beforeOverall,score:beforeStats?.overall_best_score,timeMs:beforeStats?.overall_best_time_ms}
    );
    const rankingGain=Math.max(0,afterOverall-beforeOverall);
    const milestone=body.mode==='normal'?crossedMilestone(beforeRank?.position,afterRank?.position):null;
    const smartNext=chooseSmartNext({mode:body.mode,difficulty:body.difficulty,dailyCompleted:progress.daily_completed,mastery:progress.mastery,nextTarget:afterRank?.next_target||null,bestScore:Number(afterStats?.overall_best_score||0),currentScore:score,rankAfter:afterRank?.position||null});

    return json({
      eligible:eligible&&(body.mode==='daily'||afterOverall>0),
      duplicate:false,
      score,
      ranking_points:body.mode==='normal'?rankingGain:0,
      ranking_gain:body.mode==='normal'?rankingGain:0,
      ranking_score:afterOverall,
      candidate_rank_score:candidateRankScore,
      reward_multiplier:body.mode==='normal'?difficultyMultiplier(body.difficulty):0,
      verified:true,
      time_ms:timeMs,
      hints_used:hints,
      previous_best:Number(beforeStats?.overall_best_score||0),
      best_score:Number(afterStats?.overall_best_score||0),
      new_personal_best:newPersonalBest,
      rank_before:beforeRank?.position||null,
      rank_after:afterRank?.position||null,
      rank_change:beforeRank?.position&&afterRank?.position?Number(beforeRank.position)-Number(afterRank.position):0,
      next_target:afterRank?.next_target||null,
      milestone,
      smart_next:smartNext,
      repeat_daily:repeatDaily,
      ranking_excluded:anomaly.suspicious,
      anomaly_risk:anomaly.risk,
      anomaly_reasons:anomaly.reasons,
      mode:body.mode,
      xp_gain:xpGain,
      ...progress
    });
  }catch(exception){
    console.error('Result save failed',exception);
    return error('Verified progress could not be saved right now.',500,'RESULT_SAVE_FAILED');
  }
}
