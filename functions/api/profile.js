import {error,json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {validGame} from '../_lib/games.js';
import {fetchGameStats,statsPayload} from '../_lib/player-stats.js';

const emptyGame=()=>({user:null,games:0,best:0,ranking_points:0,ranking_score:0,xp:0,level:1,streak:0,longest_streak:0,daily_completed:[],daily_remaining:3,daily_complete:false,mastery:{}});
const emptyAll=()=>({user:null,games:[],totals:{runs:0,xp:0,games_played:0,current_streak:0,best_streak:0}});

function allGamePayload(rows=[]){
  const games=rows.map(row=>({game:row.game,...statsPayload(row)}));
  const totals=games.reduce((out,item)=>{
    out.runs+=Number(item.games||0);
    out.xp+=Number(item.xp||0);
    if(Number(item.games||0)>0)out.games_played++;
    out.current_streak=Math.max(out.current_streak,Number(item.streak||0));
    out.best_streak=Math.max(out.best_streak,Number(item.longest_streak||0));
    return out;
  },{runs:0,xp:0,games_played:0,current_streak:0,best_streak:0});
  return {games,totals};
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url),game=url.searchParams.get('game')||'';
  if(game&&!validGame(game))return error('Invalid game.',400,'INVALID_GAME');
  const session=await getSession(request,env);
  if(!session)return json(game?emptyGame():emptyAll());
  try{
    if(game){
      const row=await fetchGameStats(env,session.user.id,game);
      return json({user:session.user,...statsPayload(row)});
    }
    const query=await env.DB.prepare('SELECT * FROM user_game_stats WHERE user_id=? ORDER BY game').bind(session.user.id).all();
    return json({user:session.user,...allGamePayload(query.results||[])});
  }catch(exception){
    console.error('Profile failed',exception);
    return error('Profile is temporarily unavailable.',500,'PROFILE_FAILED');
  }
}