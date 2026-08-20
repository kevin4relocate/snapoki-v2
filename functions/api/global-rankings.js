import {error,json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {levelFromXp} from '../_lib/progression.js';
import {compactPublicName} from '../_lib/public-name.js';

const BOARDS=Object.freeze({
  career:{
    label:'Career',
    primary:'career_xp',
    secondary:'career_runs',
    primaryLabel:'XP',
    secondaryLabel:'Runs',
    where:'career_runs>0'
  },
  skill:{
    label:'Skill',
    primary:'mastery_score',
    secondary:'career_runs',
    primaryLabel:'Mastery',
    secondaryLabel:'Runs',
    where:'mastery_score>0'
  },
  runs:{
    label:'Runs',
    primary:'career_runs',
    secondary:'career_xp',
    primaryLabel:'Runs',
    secondaryLabel:'XP',
    where:'career_runs>0'
  }
});

const numeric=value=>Number(value||0);

function boardFor(value){return BOARDS[value]||BOARDS.career;}

function publicRow(row,currentUserId=-1,position=null){
  const careerXp=numeric(row.career_xp),careerRuns=numeric(row.career_runs),mastery=numeric(row.mastery_score);
  return{
    position:position==null?numeric(row.position):position,
    user_id:numeric(row.user_id),
    display_name:compactPublicName(row.display_name)||'Player',
    avatar_url:row.avatar_url||null,
    career_xp:careerXp,
    career_runs:careerRuns,
    mastery_score:mastery,
    level:levelFromXp(careerXp),
    is_me:numeric(row.user_id)===numeric(currentUserId)
  };
}

function betterWhere(board){
  return `(${board.primary}>? OR (${board.primary}=? AND ${board.secondary}>?) OR (${board.primary}=? AND ${board.secondary}=? AND id<?))`;
}

async function personalSnapshot(env,userId,board){
  const me=await env.DB.prepare(`
    SELECT id AS user_id,display_name,avatar_url,career_xp,career_runs,mastery_score
    FROM users
    WHERE id=? AND ${board.where}
    LIMIT 1
  `).bind(userId).first();
  if(!me)return null;

  const primary=numeric(me[board.primary]),secondary=numeric(me[board.secondary]),id=numeric(me.user_id);
  const count=await env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM users
    WHERE ${board.where} AND ${betterWhere(board)}
  `).bind(primary,primary,secondary,primary,secondary,id).first();
  const position=numeric(count?.count)+1;
  const snapshot=publicRow(me,userId,position);

  if(position>1){
    const above=await env.DB.prepare(`
      SELECT id AS user_id,display_name,avatar_url,career_xp,career_runs,mastery_score
      FROM users
      WHERE ${board.where} AND ${betterWhere(board)}
      ORDER BY ${board.primary} ASC,${board.secondary} ASC,id DESC
      LIMIT 1
    `).bind(primary,primary,secondary,primary,secondary,id).first();
    if(above){
      const target=publicRow(above,userId,position-1);
      snapshot.next_target={
        position:position-1,
        display_name:target.display_name,
        points_to_pass:Math.max(1,numeric(above[board.primary])-primary),
        primary_label:board.primaryLabel,
        primary_value:numeric(above[board.primary])
      };
    }
  }
  if(!snapshot.next_target)snapshot.next_target=null;
  return snapshot;
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const board=boardFor(url.searchParams.get('board'));
  const limit=Math.max(10,Math.min(50,Number(url.searchParams.get('limit'))||25));
  const session=await getSession(request,env);
  const userId=Number(session?.user?.id||-1);
  try{
    const rows=await env.DB.prepare(`
      SELECT id AS user_id,display_name,avatar_url,career_xp,career_runs,mastery_score
      FROM users
      WHERE ${board.where}
      ORDER BY ${board.primary} DESC,${board.secondary} DESC,id ASC
      LIMIT ?
    `).bind(limit).all();
    const me=userId>0?await personalSnapshot(env,userId,board):null;
    const publicRows=(rows.results||[]).map((row,index)=>publicRow(row,userId,index+1));
    const merged=new Map(publicRows.map(row=>[row.position,row]));
    if(me&&me.position>limit){
      const topTarget=me.position>1?me.next_target:null;
      if(topTarget){
        const targetRow=publicRows.find(row=>row.position===topTarget.position);
        if(!targetRow)merged.set(topTarget.position,{position:topTarget.position,user_id:null,display_name:topTarget.display_name,avatar_url:null,career_xp:0,career_runs:0,mastery_score:0,level:0,is_me:false,placeholder:true});
      }
      merged.set(me.position,me);
    }else if(me){
      merged.set(me.position,me);
    }
    const output=[...merged.values()].sort((a,b)=>a.position-b.position);
    const headers=userId>0
      ?{'cache-control':'private, no-store'}
      :{'cache-control':'public, max-age=30, s-maxage=60, stale-while-revalidate=300'};
    return json({board:board.label.toLowerCase(),primary_label:board.primaryLabel,secondary_label:board.secondaryLabel,rows:output,me},200,headers);
  }catch(exception){
    console.error('Global rankings failed',exception);
    return error('Leaderboard is temporarily unavailable.',500,'GLOBAL_RANKINGS_FAILED');
  }
}
