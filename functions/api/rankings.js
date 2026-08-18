import {error,json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {validGame} from '../_lib/games.js';
import {rankSnapshot,topRankingRows} from '../_lib/player-stats.js';
import {rankingBoardFields} from '../_lib/progression.js';
import {compactPublicName} from '../_lib/public-name.js';

// SQL ownership stays in player-stats.js; Rankings are backed only by bounded user_game_stats PB rows.
function publicRow(row){return row?{...row,display_name:compactPublicName(row.display_name)}:row;}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const game=url.searchParams.get('game')||'';
  if(!validGame(game))return error('Invalid game.',400,'INVALID_GAME');
  const board=rankingBoardFields(url.searchParams.get('board')||'overall').board;
  const limit=Math.max(3,Math.min(8,Number(url.searchParams.get('limit'))||8));
  const session=await getSession(request,env);
  const userId=Number(session?.user?.id||-1);
  try{
    const me=userId>0?await rankSnapshot(env,userId,game,board):null;
    let rows;
    if(!me||me.position<=limit){
      rows=await topRankingRows(env,game,board,limit,userId);
    }else{
      const top=await topRankingRows(env,game,board,Math.min(3,limit),userId);
      const nearby=[];
      if(me.next_target){
        nearby.push({
          user_id:me.next_target.user_id,
          display_name:me.next_target.display_name,
          avatar_url:me.next_target.avatar_url,
          ranking_points:me.next_target.ranking_points,
          rank_score:me.next_target.ranking_points,
          games:0,
          position:me.position-1,
          is_me:false
        });
      }
      nearby.push({...me,is_me:true});
      const byPosition=new Map([...top,...nearby].map(row=>[Number(row.position),row]));
      rows=[...byPosition.values()].sort((a,b)=>Number(a.position)-Number(b.position)).slice(0,limit);
    }
    return json({board,rows:rows.map(publicRow),me:publicRow(me)});
  }catch(exception){
    console.error('Rankings failed',exception);
    return error('Rankings are temporarily unavailable.',500,'RANKINGS_FAILED');
  }
}
