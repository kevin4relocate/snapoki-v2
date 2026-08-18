import {error,json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {validGame} from '../_lib/games.js';
import {fetchGameStats,statsPayload} from '../_lib/player-stats.js';

export async function onRequestGet({request,env}){
  const url=new URL(request.url),game=url.searchParams.get('game')||'';
  if(!validGame(game))return error('Invalid game.',400,'INVALID_GAME');
  const session=await getSession(request,env);
  if(!session)return json({user:null,games:0,best:0,ranking_points:0,ranking_score:0,xp:0,level:1,streak:0,longest_streak:0,daily_completed:[],daily_remaining:3,daily_complete:false,mastery:{}});
  try{
    const row=await fetchGameStats(env,session.user.id,game);
    return json({user:session.user,...statsPayload(row)});
  }catch(exception){
    console.error('Profile failed',exception);
    return error('Profile is temporarily unavailable.',500,'PROFILE_FAILED');
  }
}
