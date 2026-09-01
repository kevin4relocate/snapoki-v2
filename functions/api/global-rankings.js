import {error,json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {levelFromXp} from '../_lib/progression.js';
import {compactPublicName} from '../_lib/public-name.js';

const BOARDS=Object.freeze({
  career:{label:'Career',primary:'career_xp',secondary:'career_runs',primaryLabel:'XP',secondaryLabel:'Runs',where:'career_runs>0'},
  skill:{label:'Best Score',primary:'mastery_score',secondary:'career_runs',primaryLabel:'Rank Pts',secondaryLabel:'Runs',where:'mastery_score>0'},
  runs:{label:'Most Played',primary:'career_runs',secondary:'career_xp',primaryLabel:'Runs',secondaryLabel:'XP',where:'career_runs>0'}
});

const numeric=value=>Number(value||0);
const boardFor=value=>BOARDS[value]||BOARDS.career;

function publicRow(row,currentUserId=-1,position=null){
  const careerXp=numeric(row.career_xp),careerRuns=numeric(row.career_runs),mastery=numeric(row.mastery_score);
  return{position:position==null?numeric(row.position):position,user_id:numeric(row.user_id),display_name:compactPublicName(row.display_name)||'Player',avatar_url:row.avatar_url||null,career_xp:careerXp,career_runs:careerRuns,mastery_score:mastery,level:levelFromXp(careerXp),is_me:numeric(row.user_id)===numeric(currentUserId)};
}

function betterWhere(board){return `(${board.primary}>? OR (${board.primary}=? AND ${board.secondary}>?) OR (${board.primary}=? AND ${board.secondary}=? AND user_id<?))`;}

const TOTALS_SQL=`SELECT u.id AS user_id,u.display_name,u.avatar_url,
  COALESCE(SUM(s.xp),0) AS career_xp,
  COALESCE(SUM(s.games_completed),0) AS career_runs,
  COALESCE(SUM(s.overall_rank_score),0) AS mastery_score
  FROM users u JOIN user_game_stats s ON s.user_id=u.id
  WHERE u.google_sub NOT LIKE 'demo:%'
  GROUP BY u.id`;

async function personalSnapshot(env,userId,board){
  const me=await env.DB.prepare(`SELECT * FROM (${TOTALS_SQL}) totals WHERE user_id=? AND ${board.where} LIMIT 1`).bind(userId).first();
  if(!me)return null;
  const primary=numeric(me[board.primary]),secondary=numeric(me[board.secondary]),id=numeric(me.user_id);
  const binds=[primary,primary,secondary,primary,secondary,id];
  const count=await env.DB.prepare(`SELECT COUNT(*) AS count FROM (${TOTALS_SQL}) totals WHERE ${board.where} AND ${betterWhere(board)}`).bind(...binds).first();
  const position=numeric(count?.count)+1;
  const snapshot=publicRow(me,userId,position);
  if(position>1){
    const above=await env.DB.prepare(`SELECT * FROM (${TOTALS_SQL}) totals WHERE ${board.where} AND ${betterWhere(board)} ORDER BY ${board.primary} ASC,${board.secondary} ASC,user_id DESC LIMIT 1`).bind(...binds).first();
    if(above){
      const abovePrimary=numeric(above[board.primary]),aboveSecondary=numeric(above[board.secondary]);
      const gapValue=abovePrimary>primary?abovePrimary-primary:Math.max(1,aboveSecondary-secondary);
      const gapLabel=abovePrimary>primary?board.primaryLabel.toLowerCase():board.secondaryLabel.toLowerCase();
      snapshot.next_target={position:position-1,display_name:compactPublicName(above.display_name)||'Player',gap_value:gapValue,gap_label:gapLabel};
    }
  }
  if(!snapshot.next_target)snapshot.next_target=null;
  return snapshot;
}

async function fromTotals(env,board,limit,userId){
  const rows=await env.DB.prepare(`SELECT * FROM (${TOTALS_SQL}) totals WHERE ${board.where} ORDER BY ${board.primary} DESC,${board.secondary} DESC,user_id ASC LIMIT ?`).bind(limit).all();
  const me=userId>0?await personalSnapshot(env,userId,board):null;
  const publicRows=(rows.results||[]).map((row,index)=>publicRow(row,userId,index+1));
  const merged=new Map(publicRows.map(row=>[row.position,row]));
  if(me)merged.set(me.position,me);
  return{rows:[...merged.values()].sort((a,b)=>a.position-b.position),me};
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const board=boardFor(url.searchParams.get('board'));
  const limit=Math.max(10,Math.min(50,Number(url.searchParams.get('limit'))||25));
  const session=await getSession(request,env);
  const userId=Number(session?.user?.id||-1);
  try{
    const rows=await env.DB.prepare(`SELECT id AS user_id,display_name,avatar_url,career_xp,career_runs,mastery_score FROM users WHERE google_sub NOT LIKE 'demo:%' AND ${board.where} ORDER BY ${board.primary} DESC,${board.secondary} DESC,id ASC LIMIT ?`).bind(limit).all();
    const me=userId>0?await personalSnapshot(env,userId,board):null;
    const publicRows=(rows.results||[]).map((row,index)=>publicRow(row,userId,index+1));
    const merged=new Map(publicRows.map(row=>[row.position,row]));
    if(me)merged.set(me.position,me);
    const output=[...merged.values()].sort((a,b)=>a.position-b.position);
    const headers=userId>0?{'cache-control':'private, no-store'}:{'cache-control':'public, max-age=30, s-maxage=60, stale-while-revalidate=300'};
    return json({board:board.label.toLowerCase(),primary_label:board.primaryLabel,secondary_label:board.secondaryLabel,rows:output,me},200,headers);
  }catch(exception){
    try{
      const fallback=await fromTotals(env,board,limit,userId);
      const headers=userId>0?{'cache-control':'private, no-store'}:{'cache-control':'public, max-age=30, s-maxage=60, stale-while-revalidate=300'};
      return json({board:board.label.toLowerCase(),primary_label:board.primaryLabel,secondary_label:board.secondaryLabel,rows:fallback.rows,me:fallback.me},200,headers);
    }catch(fallbackException){
      console.error('Global rankings failed',exception,fallbackException);
      return error('Leaderboard is temporarily unavailable.',500,'GLOBAL_RANKINGS_FAILED');
    }
  }
}
