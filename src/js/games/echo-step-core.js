import {rngFromSeed,orthogonalNeighbors,rcOf,indexOf} from './utils.js';

const DIRS={u:{dr:-1,dc:0},r:{dr:0,dc:1},d:{dr:1,dc:0},l:{dr:0,dc:-1}};
const LEVEL={
  easy:{size:6,delay:2,minMoves:8,maxMoves:11,shared:2,playerPhase:2,echoPhase:2,minTurns:3},
  medium:{size:8,delay:3,minMoves:14,maxMoves:19,shared:4,playerPhase:5,echoPhase:5,minTurns:6},
  hard:{size:10,delay:4,minMoves:22,maxMoves:30,shared:8,playerPhase:10,echoPhase:10,minTurns:10}
};

function inBounds(row,col,size){return row>=0&&col>=0&&row<size&&col<size;}
function translated(index,size,dr,dc){const[row,col]=rcOf(index,size),r=row+dr,c=col+dc;return inBounds(r,c,size)?indexOf(r,c,size):-1;}
function actionBetween(a,b,size){const[ar,ac]=rcOf(a,size),[br,bc]=rcOf(b,size);if(br<ar)return'u';if(br>ar)return'd';if(bc<ac)return'l';return'r';}
function targetFor(index,size,action){const dir=DIRS[action];if(!dir)return-1;const[row,col]=rcOf(index,size),r=row+dir.dr,c=col+dir.dc;return inBounds(r,c,size)?indexOf(r,c,size):-1;}
function countTurns(actions){let turns=0;for(let i=1;i<actions.length;i++)if(actions[i]!==actions[i-1])turns++;return turns;}
function cachedSet(puzzle,key,source){return puzzle[key]||(puzzle[key]=new Set(source||[]));}
function sharedBlockedSet(puzzle){return cachedSet(puzzle,'_sharedBlockedSet',puzzle.blocked);}
function playerPhaseSet(puzzle){return cachedSet(puzzle,'_playerPhaseSet',puzzle.playerBarriers);}
function echoPhaseSet(puzzle){return cachedSet(puzzle,'_echoPhaseSet',puzzle.echoBarriers);}
function moveEcho(puzzle,state,action){
  const target=targetFor(state.echo,puzzle.size,action);
  if(target<0)return{ok:false,reason:'Echo left the board.'};
  if(sharedBlockedSet(puzzle).has(target))return{ok:false,reason:'Echo hit a dark wall.'};
  if(echoPhaseSet(puzzle).has(target))return{ok:false,reason:'Echo hit a cyan phase wall.'};
  if(target===state.player)return{ok:false,reason:'Echo collided with YOU.'};
  return{ok:true,state:{...state,echo:target}};
}
function bothHome(puzzle,state){return state.player===puzzle.playerGoal&&state.echo===puzzle.echoGoal;}

export function advanceEchoState(puzzle,state,action){
  const playerTarget=targetFor(state.player,puzzle.size,action);
  if(playerTarget<0)return{ok:false,reason:'That move leaves the board.',playerBlocked:true};
  if(sharedBlockedSet(puzzle).has(playerTarget))return{ok:false,reason:'That move hits a dark wall.',playerBlocked:true};
  if(playerPhaseSet(puzzle).has(playerTarget))return{ok:false,reason:'Purple phase wall: YOU cannot cross it.',playerBlocked:true};
  if(playerTarget===state.echo)return{ok:false,reason:'Echo is occupying that cell.',playerBlocked:true};
  let next={player:playerTarget,echo:state.echo,pending:[...state.pending,action]};
  if(next.pending.length>puzzle.delay){
    const echoAction=next.pending.shift(),moved=moveEcho(puzzle,next,echoAction);
    if(!moved.ok)return moved;
    next=moved.state;
  }
  return{ok:true,state:next};
}

export function forecastEchoStep(puzzle,state,actions){
  let cursor={player:state.player,echo:state.echo,pending:[...state.pending]};
  const playerSteps=[],echoSteps=[];
  for(let turn=0;turn<actions.length;turn++){
    const action=actions[turn],playerFrom=cursor.player,echoFrom=cursor.echo,echoAction=cursor.pending.length===puzzle.delay?cursor.pending[0]:'';
    const next=advanceEchoState(puzzle,cursor,action);
    if(!next.ok)return{ok:false,reason:next.reason,state:cursor,playerSteps,echoSteps};
    cursor=next.state;
    playerSteps.push({from:playerFrom,to:cursor.player,action,turn:turn+1});
    if(cursor.echo!==echoFrom)echoSteps.push({from:echoFrom,to:cursor.echo,action:echoAction,turn:turn+1});
  }
  return{ok:true,state:cursor,playerSteps,echoSteps};
}

export function simulateEchoStep(puzzle,actions){
  let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};
  for(let i=0;i<actions.length;i++){
    const next=advanceEchoState(puzzle,state,actions[i]);
    if(!next.ok)return{solved:false,reason:next.reason,state,terminalAt:i};
    state=next.state;
    if(bothHome(puzzle,state))return{solved:i===actions.length-1,reason:i===actions.length-1?'':'The synchronized finish happened before the final submitted move.',state,terminalAt:i+1};
  }
  return{solved:false,reason:'YOU and Echo are not on both goals at the same time.',state,terminalAt:actions.length};
}

function routeActions(path,size){const actions=[];for(let i=1;i<path.length;i++)actions.push(actionBetween(path[i-1],path[i],size));return actions;}
function constructiveRoute(size,targetMoves,rng,minTurns){
  const half=Math.floor(size/2),transpose=rng()>=.5,side=rng()>=.5,reverse=rng()>=.5,mirror=rng()>=.5,base=[];
  for(let row=0;row<size;row++){
    const forward=(row%2===0)!==mirror;
    if(forward){for(let col=0;col<half;col++)base.push([row,col]);}
    else{for(let col=half-1;col>=0;col--)base.push([row,col]);}
  }
  if(reverse)base.reverse();
  const needed=targetMoves+1,maxStart=Math.max(0,base.length-needed),options=[];
  for(let start=0;start<=maxStart;start++){
    const local=base.slice(start,start+needed),localPath=local.map(([row,col])=>indexOf(row,col,size)),actions=routeActions(localPath,size),first=local[0],last=local.at(-1),direct=Math.abs(first[0]-last[0])+Math.abs(first[1]-last[1]),turns=countTurns(actions),quality=turns*100+direct*5+rng();
    options.push({start,turns,direct,quality});
  }
  const minDirect=Math.max(3,Math.floor(targetMoves*.18)),eligible=options.filter(option=>option.turns>=minTurns&&option.direct>=minDirect),pool=eligible.length?eligible:options.sort((a,b)=>b.quality-a.quality).slice(0,Math.min(4,options.length)),picked=pool[Math.floor(rng()*pool.length)]||{start:0},segment=base.slice(picked.start,picked.start+needed),path=segment.map(([row,col])=>{let r=row,c=col+(side?half:0);if(transpose)[r,c]=[c,r];return indexOf(r,c,size);}),delta=transpose?[side?-half:half,0]:[0,side?-half:half];
  return{path,actions:routeActions(path,size),delta};
}
function neighborScore(index,route,size){let score=0;for(const neighbor of orthogonalNeighbors(index,size,size))if(route.has(neighbor))score+=3;return score;}
function selectPhaseBarriers({count,size,ownRoute,otherRoute,endpoints,used,rng}){
  const selected=[];
  const cross=[...otherRoute].filter(index=>!ownRoute.has(index)&&!endpoints.has(index)&&!used.has(index)).map(index=>({index,score:30+neighborScore(index,ownRoute,size)+rng()*2})).sort((a,b)=>b.score-a.score);
  const crossTarget=Math.min(cross.length,Math.max(1,Math.ceil(count*.45)));
  for(const item of cross.slice(0,crossTarget)){selected.push(item.index);used.add(item.index);}
  const candidates=[];
  for(let index=0;index<size*size;index++){
    if(ownRoute.has(index)||endpoints.has(index)||used.has(index))continue;
    candidates.push({index,score:neighborScore(index,ownRoute,size)*5+neighborScore(index,otherRoute,size)*2+rng()*3});
  }
  candidates.sort((a,b)=>b.score-a.score);
  for(const item of candidates){if(selected.length>=count)break;selected.push(item.index);used.add(item.index);}
  return selected.sort((a,b)=>a-b);
}
function selectSharedBarriers({count,size,playerRoute,echoRoute,endpoints,used,rng}){
  const candidates=[];
  for(let index=0;index<size*size;index++){
    if(playerRoute.has(index)||echoRoute.has(index)||endpoints.has(index)||used.has(index))continue;
    candidates.push({index,score:neighborScore(index,playerRoute,size)*4+neighborScore(index,echoRoute,size)*4+rng()*2});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const out=[];
  for(const item of candidates.slice(0,count)){out.push(item.index);used.add(item.index);}
  return out.sort((a,b)=>a-b);
}

export function generateEchoStep(difficulty='easy',seed='echo-step'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,rng=rngFromSeed(`${seed}:echo-step:v4-phase`),target=cfg.minMoves+Math.floor(rng()*(cfg.maxMoves-cfg.minMoves+1)),route=constructiveRoute(cfg.size,target,rng,cfg.minTurns),playerStart=route.path[0],playerGoal=route.path.at(-1),echoStart=translated(playerStart,cfg.size,route.delta[0],route.delta[1]);
  const echoPathEnd=Math.max(0,route.path.length-1-cfg.delay),echoGoal=translated(route.path[echoPathEnd],cfg.size,route.delta[0],route.delta[1]),playerPath=[...route.path],echoPath=route.path.slice(0,echoPathEnd+1).map(index=>translated(index,cfg.size,route.delta[0],route.delta[1])),playerRoute=new Set(playerPath),echoRoute=new Set(echoPath),endpoints=new Set([playerStart,playerGoal,echoStart,echoGoal]),used=new Set();
  const playerBarriers=selectPhaseBarriers({count:cfg.playerPhase,size:cfg.size,ownRoute:playerRoute,otherRoute:echoRoute,endpoints,used,rng});
  const echoBarriers=selectPhaseBarriers({count:cfg.echoPhase,size:cfg.size,ownRoute:echoRoute,otherRoute:playerRoute,endpoints,used,rng});
  const blocked=selectSharedBarriers({count:cfg.shared,size:cfg.size,playerRoute,echoRoute,endpoints,used,rng});
  const puzzle={size:cfg.size,delay:cfg.delay,blocked,playerBarriers,echoBarriers,playerStart,echoStart,playerGoal,echoGoal,solution:[...route.actions],solutionMoves:route.actions.length,difficulty,seed,offset:{dr:route.delta[0],dc:route.delta[1]},turns:countTurns(route.actions),phaseVersion:1};
  if(!simulateEchoStep(puzzle,puzzle.solution).solved)throw new Error('Echo Step generator produced an invalid asymmetric synchronized solution.');
  return puzzle;
}
