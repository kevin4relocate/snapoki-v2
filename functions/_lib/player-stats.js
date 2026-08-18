import {compactPublicName} from './public-name.js';
import {dailyProgressFromRow,levelFromXp,masteryFromRow,rankingBoardFields} from './progression.js';

const numeric=value=>Number(value||0);
const timeValue=value=>value==null?Number.MAX_SAFE_INTEGER:Number(value);

export async function fetchGameStats(env,userId,game){
  return env.DB.prepare('SELECT * FROM user_game_stats WHERE user_id=? AND game=? LIMIT 1').bind(userId,game).first();
}

export function statsPayload(row,today=new Date().toISOString().slice(0,10)){
  const daily=dailyProgressFromRow(row,today);
  return{
    games:numeric(row?.games_completed),
    best:numeric(row?.overall_best_score),
    ranking_points:numeric(row?.overall_rank_score),
    ranking_score:numeric(row?.overall_rank_score),
    xp:numeric(row?.xp),
    level:levelFromXp(row?.xp),
    streak:daily.streak,
    longest_streak:daily.longestStreak,
    daily_completed:daily.completed,
    daily_remaining:Math.max(0,3-daily.completed.length),
    daily_complete:daily.mask===7,
    mastery:masteryFromRow(row||{})
  };
}

function betterSql(fields){
  return `(
    ${fields.rank}>?
    OR (${fields.rank}=? AND ${fields.score}>?)
    OR (${fields.rank}=? AND ${fields.score}=? AND COALESCE(${fields.time},9223372036854775807)<?)
    OR (${fields.rank}=? AND ${fields.score}=? AND COALESCE(${fields.time},9223372036854775807)=? AND COALESCE(${fields.achieved},'9999-12-31T23:59:59.999Z')<?)
    OR (${fields.rank}=? AND ${fields.score}=? AND COALESCE(${fields.time},9223372036854775807)=? AND COALESCE(${fields.achieved},'9999-12-31T23:59:59.999Z')=? AND user_id<?)
  )`;
}

function betterBinds(me){
  const rank=numeric(me.rank_score),score=numeric(me.best_score),time=timeValue(me.best_time_ms),achieved=me.achieved_at||'9999-12-31T23:59:59.999Z',userId=numeric(me.user_id);
  return[
    rank,
    rank,score,
    rank,score,time,
    rank,score,time,achieved,
    rank,score,time,achieved,userId
  ];
}

export async function rankSnapshot(env,userId,game,board='overall'){
  const fields=rankingBoardFields(board);
  const row=await env.DB.prepare(`
    SELECT s.user_id,u.display_name,u.avatar_url,
           s.${fields.runs} AS games,
           s.${fields.rank} AS rank_score,
           s.${fields.score} AS best_score,
           s.${fields.time} AS best_time_ms,
           s.${fields.achieved} AS achieved_at
    FROM user_game_stats s
    JOIN users u ON u.id=s.user_id
    WHERE s.user_id=? AND s.game=? AND s.${fields.rank}>0
    LIMIT 1
  `).bind(userId,game).first();
  if(!row)return null;
  const me={
    user_id:numeric(row.user_id),
    display_name:compactPublicName(row.display_name),
    avatar_url:row.avatar_url||null,
    games:numeric(row.games),
    ranking_points:numeric(row.rank_score),
    rank_score:numeric(row.rank_score),
    best:numeric(row.best_score),
    best_score:numeric(row.best_score),
    best_time_ms:row.best_time_ms==null?null:numeric(row.best_time_ms),
    achieved_at:row.achieved_at||null,
    board:fields.board
  };
  const binds=[game,...betterBinds({...me,rank_score:me.rank_score,best_score:me.best_score})];
  const count=await env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM user_game_stats
    WHERE game=? AND ${fields.rank}>0 AND ${betterSql(fields)}
  `).bind(...binds).first();
  me.position=numeric(count?.count)+1;

  if(me.position>1){
    const above=await env.DB.prepare(`
      SELECT s.user_id,u.display_name,u.avatar_url,
             s.${fields.runs} AS games,
             s.${fields.rank} AS rank_score,
             s.${fields.score} AS best_score,
             s.${fields.time} AS best_time_ms,
             s.${fields.achieved} AS achieved_at
      FROM user_game_stats s
      JOIN users u ON u.id=s.user_id
      WHERE s.game=? AND s.${fields.rank}>0 AND ${betterSql(fields)}
      ORDER BY s.${fields.rank} ASC,
               s.${fields.score} ASC,
               COALESCE(s.${fields.time},9223372036854775807) DESC,
               COALESCE(s.${fields.achieved},'9999-12-31T23:59:59.999Z') DESC,
               s.user_id DESC
      LIMIT 1
    `).bind(game,...betterBinds({...me,rank_score:me.rank_score,best_score:me.best_score})).first();
    if(above){
      const abovePoints=numeric(above.rank_score);
      me.next_target={
        user_id:numeric(above.user_id),
        display_name:compactPublicName(above.display_name)||'Player',
        avatar_url:above.avatar_url||null,
        ranking_points:abovePoints,
        points_to_pass:Math.max(1,abovePoints-me.rank_score+(abovePoints===me.rank_score?0:1))
      };
    }
  }
  if(!me.next_target)me.next_target=null;
  return me;
}

export async function topRankingRows(env,game,board='overall',limit=8,currentUserId=-1){
  const fields=rankingBoardFields(board);
  const query=await env.DB.prepare(`
    SELECT s.user_id,u.display_name,u.avatar_url,
           s.${fields.runs} AS games,
           s.${fields.rank} AS ranking_points,
           s.${fields.rank} AS rank_score,
           s.${fields.score} AS best,
           s.${fields.score} AS best_score,
           s.${fields.time} AS best_time_ms,
           s.${fields.achieved} AS achieved_at
    FROM user_game_stats s
    JOIN users u ON u.id=s.user_id
    WHERE s.game=? AND s.${fields.rank}>0
    ORDER BY s.${fields.rank} DESC,
             s.${fields.score} DESC,
             COALESCE(s.${fields.time},9223372036854775807) ASC,
             COALESCE(s.${fields.achieved},'9999-12-31T23:59:59.999Z') ASC,
             s.user_id ASC
    LIMIT ?
  `).bind(game,limit).all();
  return (query.results||[]).map((row,index)=>({
    ...row,
    position:index+1,
    display_name:compactPublicName(row.display_name),
    is_me:Number(row.user_id)===Number(currentUserId)
  }));
}
