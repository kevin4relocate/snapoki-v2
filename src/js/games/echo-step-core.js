import {rngFromSeed,orthogonalNeighbors,rcOf,indexOf} from './utils.js';

const DIRS={u:{dr:-1,dc:0},r:{dr:0,dc:1},d:{dr:1,dc:0},l:{dr:0,dc:-1}};
const LEVEL={
  easy:{size:6,delay:2,minMoves:8,maxMoves:11,shared:2,playerPhase:2,echoPhase:2,minTurns:3},
  medium:{size:8,delay:3,offset:2,totalMoves:28,loopMoves:4,decoys:4,deepTraps:1,deepDepth:2,minTurns:15,candidateBudget:36},
  hard:{size:10,delay:4,offset:2,totalMoves:42,loopMoves:6,decoys:6,deepTraps:2,deepDepth:3,minTurns:24,candidateBudget:44}
};

function inBounds(row,col,size){return row>=0&&col>=0&&row<size&&col<size;}
function translated(index,size,dr,dc){const[row,col]=rcOf(index,size),r=row+dr,c=col+dc;return inBounds(r,c,size)?indexOf(r,c,size):-1;}
function actionBetween(a,b,size){const[ar,ac]=rcOf(a,size),[br,bc]=rcOf(b,size);if(br<ar)return'u';if(br>ar)return'd';if(bc<ac)return'l';return'r';}
function targetFor(index,size,action){const dir=DIRS[action];if(!dir)return-1;const[row,col]=rcOf(index,size),r=row+dir.dr,c=col+dir.dc;return inBounds(r,c,size)?indexOf(r,c,size):-1;}
function countTurns(actions){let turns=0;for(let i=1;i<actions.length;i++)if(actions[i]!==actions[i-1])turns++;return turns;}
function shuffle(items,rng){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
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

function generateEasyEchoStep(cfg,difficulty,seed){
  const rng=rngFromSeed(`${seed}:echo-step:v4-phase`),target=cfg.minMoves+Math.floor(rng()*(cfg.maxMoves-cfg.minMoves+1)),route=constructiveRoute(cfg.size,target,rng,cfg.minTurns),playerStart=route.path[0],playerGoal=route.path.at(-1),echoStart=translated(playerStart,cfg.size,route.delta[0],route.delta[1]);
  const echoPathEnd=Math.max(0,route.path.length-1-cfg.delay),echoGoal=translated(route.path[echoPathEnd],cfg.size,route.delta[0],route.delta[1]),playerPath=[...route.path],echoPath=route.path.slice(0,echoPathEnd+1).map(index=>translated(index,cfg.size,route.delta[0],route.delta[1])),playerRoute=new Set(playerPath),echoRoute=new Set(echoPath),endpoints=new Set([playerStart,playerGoal,echoStart,echoGoal]),used=new Set();
  const playerBarriers=selectPhaseBarriers({count:cfg.playerPhase,size:cfg.size,ownRoute:playerRoute,otherRoute:echoRoute,endpoints,used,rng});
  const echoBarriers=selectPhaseBarriers({count:cfg.echoPhase,size:cfg.size,ownRoute:echoRoute,otherRoute:playerRoute,endpoints,used,rng});
  const blocked=selectSharedBarriers({count:cfg.shared,size:cfg.size,playerRoute,echoRoute,endpoints,used,rng});
  const puzzle={size:cfg.size,delay:cfg.delay,blocked,playerBarriers,echoBarriers,playerStart,echoStart,playerGoal,echoGoal,solution:[...route.actions],solutionMoves:route.actions.length,difficulty,seed,offset:{dr:route.delta[0],dc:route.delta[1]},turns:countTurns(route.actions),phaseVersion:1,generatorVersion:4};
  if(!simulateEchoStep(puzzle,puzzle.solution).solved)throw new Error('Echo Step easy generator produced an invalid synchronized solution.');
  return puzzle;
}

function safeCellsForOffset(size,dr,dc){
  const cells=new Set();
  for(let index=0;index<size*size;index++)if(translated(index,size,dr,dc)>=0)cells.add(index);
  return cells;
}
function temporalLoopOptions(size,safeCells,loopMoves){
  const options=[];
  const add=(goal,coords)=>{
    if(!coords.every(([row,col])=>inBounds(row,col,size)&&safeCells.has(indexOf(row,col,size))))return;
    options.push({goal,loop:[...coords.map(([row,col])=>indexOf(row,col,size)),goal]});
  };
  for(const goal of safeCells){
    const[r,c]=rcOf(goal,size);
    for(const sr of [-1,1])for(const sc of [-1,1]){
      if(loopMoves===4)add(goal,[[r,c+sc],[r+sr,c+sc],[r+sr,c]]);
      else{
        add(goal,[[r,c+sc],[r,c+2*sc],[r+sr,c+2*sc],[r+sr,c+sc],[r+sr,c]]);
        add(goal,[[r+sr,c],[r+2*sr,c],[r+2*sr,c+sc],[r+sr,c+sc],[r,c+sc]]);
      }
    }
  }
  return options;
}
function growInducedPath({size,safeCells,targetNodes,start,banned,rng,nodeBudget=14000}){
  const path=[start],used=new Set(path);let best=[...path],visited=0;
  function grow(current){
    visited++;
    if(path.length>best.length)best=[...path];
    if(path.length>=targetNodes)return true;
    if(visited>nodeBudget)return false;
    const previous=path.length>1?path[path.length-2]:-1;
    const options=orthogonalNeighbors(current,size,size).filter(next=>safeCells.has(next)&&!used.has(next)&&!banned.has(next)).filter(next=>orthogonalNeighbors(next,size,size).filter(cell=>used.has(cell)).length===1).map(next=>{
      const onward=orthogonalNeighbors(next,size,size).filter(cell=>safeCells.has(cell)&&!used.has(cell)&&!banned.has(cell)).length;
      const turn=previous>=0&&actionBetween(previous,current,size)!==actionBetween(current,next,size)?1:0;
      return{next,onward,turn,jitter:rng()};
    }).sort((a,b)=>b.turn-a.turn||b.onward-a.onward||a.jitter-b.jitter);
    for(const option of options){
      used.add(option.next);path.push(option.next);
      if(grow(option.next))return true;
      path.pop();used.delete(option.next);
    }
    return false;
  }
  grow(start);
  return path.length>=targetNodes?[...path]:best;
}
function bareTemporalPuzzle(size,delay,route,dr,dc){
  const playerStart=route[0],playerGoal=route.at(-1),echoStart=translated(playerStart,size,dr,dc),echoGoal=translated(route[route.length-1-delay],size,dr,dc);
  return{size,delay,blocked:[],playerBarriers:[],echoBarriers:[],playerStart,echoStart,playerGoal,echoGoal};
}
function buildTemporalRoute(cfg,seed,attempt){
  const rng=rngFromSeed(`${seed}:echo-step:v4-route:${attempt}`),offsets=shuffle([[0,cfg.offset],[0,-cfg.offset],[cfg.offset,0],[-cfg.offset,0]],rng);
  for(const[dr,dc]of offsets){
    const safeCells=safeCellsForOffset(cfg.size,dr,dc),loops=shuffle(temporalLoopOptions(cfg.size,safeCells,cfg.loopMoves),rng).slice(0,40);
    for(const option of loops){
      const baseMoves=cfg.totalMoves-cfg.loopMoves,targetNodes=baseMoves+1,banned=new Set(option.loop.slice(0,-1)),grown=growInducedPath({size:cfg.size,safeCells,targetNodes,start:option.goal,banned,rng});
      if(grown.length<targetNodes)continue;
      const base=[...grown].reverse(),route=[...base,...option.loop],actions=routeActions(route,cfg.size);
      if(countTurns(actions)<cfg.minTurns)continue;
      const bare=bareTemporalPuzzle(cfg.size,cfg.delay,route,dr,dc);
      if(bare.echoStart<0||bare.echoGoal<0||!simulateEchoStep(bare,actions).solved)continue;
      return{route,actions,dr,dc,rng};
    }
  }
  return null;
}
function routePositions(route,baseEnd){
  const positions=new Map();
  for(let i=0;i<=baseEnd;i++)positions.set(route[i],i);
  return positions;
}
function decoyPathCandidates({cfg,route,dr,dc,rng}){
  const routeSet=new Set(route),baseEnd=route.length-cfg.loopMoves-1,positions=routePositions(route,baseEnd),echoCanonical=new Set(route.slice(0,route.length-cfg.delay).map(cell=>translated(cell,cfg.size,dr,dc))),playerStart=route[0],playerGoal=route.at(-1),echoStart=translated(playerStart,cfg.size,dr,dc),echoGoal=translated(route[route.length-1-cfg.delay],cfg.size,dr,dc),endpoints=new Set([playerStart,playerGoal,echoStart,echoGoal]),out=[];
  const validTrap=cell=>{const trap=translated(cell,cfg.size,dr,dc);return trap>=0&&!echoCanonical.has(trap)&&!endpoints.has(trap);};
  const rootsFor=cell=>orthogonalNeighbors(cell,cfg.size,cfg.size).map(next=>positions.get(next)).filter(index=>Number.isInteger(index)&&index>=3&&index<=baseEnd-3).sort((a,b)=>a-b);
  const add=(cells,roots)=>{
    const trapCell=cells.at(-1);if(!validTrap(trapCell))return;
    const rootGap=roots.length>1?roots.at(-1)-roots[0]:0,shortcut=roots.length>1&&rootGap>=3,depth=cells.length,score=(shortcut?90:25)+rootGap*4+depth*22+roots.length*5+rng();
    out.push({cells,roots,rootMove:roots[Math.floor(roots.length/2)],trapTarget:translated(trapCell,cfg.size,dr,dc),depth,shortcut,score});
  };
  for(let first=0;first<cfg.size*cfg.size;first++){
    if(routeSet.has(first)||endpoints.has(first)||translated(first,cfg.size,dr,dc)<0)continue;
    const roots=rootsFor(first);if(!roots.length)continue;
    add([first],roots);
    for(const second of orthogonalNeighbors(first,cfg.size,cfg.size)){
      if(second===first||routeSet.has(second)||endpoints.has(second)||translated(second,cfg.size,dr,dc)<0)continue;
      if(orthogonalNeighbors(second,cfg.size,cfg.size).filter(cell=>positions.has(cell)).length>1)continue;
      add([first,second],roots);
      if(cfg.deepDepth>=3)for(const third of orthogonalNeighbors(second,cfg.size,cfg.size)){
        if(third===first||third===second||routeSet.has(third)||endpoints.has(third)||translated(third,cfg.size,dr,dc)<0)continue;
        if(orthogonalNeighbors(third,cfg.size,cfg.size).filter(cell=>positions.has(cell)).length>1)continue;
        add([first,second,third],roots);
      }
    }
  }
  return out.sort((a,b)=>b.score-a.score);
}
function selectTemporalDecoys(cfg,candidates){
  const chosen=[],usedCells=new Set(),usedTraps=new Set(),usedRoots=[];
  const compatible=candidate=>{
    if(candidate.cells.some(cell=>usedCells.has(cell))||usedTraps.has(candidate.trapTarget))return false;
    if(usedRoots.some(root=>Math.abs(root-candidate.rootMove)<2))return false;
    return true;
  };
  const take=candidate=>{chosen.push(candidate);for(const cell of candidate.cells)usedCells.add(cell);usedTraps.add(candidate.trapTarget);usedRoots.push(candidate.rootMove);};
  for(const candidate of candidates)if(chosen.filter(item=>item.depth>=cfg.deepDepth).length<cfg.deepTraps&&candidate.depth>=cfg.deepDepth&&compatible(candidate))take(candidate);
  if(chosen.filter(item=>item.depth>=cfg.deepDepth).length<cfg.deepTraps)return[];
  for(const candidate of candidates)if(chosen.length<cfg.decoys&&candidate.shortcut&&compatible(candidate))take(candidate);
  for(const candidate of candidates)if(chosen.length<cfg.decoys&&compatible(candidate))take(candidate);
  return chosen.length>=cfg.decoys?chosen.slice(0,cfg.decoys):[];
}
function buildTemporalWalls({cfg,route,decoys,dr,dc}){
  const playerStart=route[0],playerGoal=route.at(-1),echoStart=translated(playerStart,cfg.size,dr,dc),echoGoal=translated(route[route.length-1-cfg.delay],cfg.size,dr,dc),endpoints=new Set([playerStart,playerGoal,echoStart,echoGoal]),playerPass=new Set(route),echoPass=new Set(route.slice(0,route.length-cfg.delay).map(cell=>translated(cell,cfg.size,dr,dc))),trapTargets=new Set();
  for(const decoy of decoys){
    for(const cell of decoy.cells)playerPass.add(cell);
    for(const cell of decoy.cells.slice(0,-1))echoPass.add(translated(cell,cfg.size,dr,dc));
    trapTargets.add(decoy.trapTarget);
  }
  const blocked=[],playerBarriers=[],echoBarriers=[];
  for(let index=0;index<cfg.size*cfg.size;index++){
    if(endpoints.has(index))continue;
    let playerOpen=playerPass.has(index),echoOpen=echoPass.has(index);
    if(trapTargets.has(index)){playerOpen=true;echoOpen=false;}
    if(!playerOpen&&!echoOpen)blocked.push(index);
    else if(!playerOpen)playerBarriers.push(index);
    else if(!echoOpen)echoBarriers.push(index);
  }
  return{blocked,playerBarriers,echoBarriers};
}
function collisionPressure(puzzle){
  let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]},pressure=0;
  for(const action of puzzle.solution){
    const next=advanceEchoState(puzzle,state,action);if(!next.ok)break;state=next.state;
    const[pr,pc]=rcOf(state.player,puzzle.size),[er,ec]=rcOf(state.echo,puzzle.size);
    if(Math.abs(pr-er)+Math.abs(pc-ec)<=2)pressure++;
  }
  return pressure;
}
function temporalMetrics(puzzle,decoys,cfg){
  const deepTraps=decoys.filter(item=>item.depth>=cfg.deepDepth).length,shortcutDecoys=decoys.filter(item=>item.shortcut).length,maxFalseRouteDepth=Math.max(0,...decoys.map(item=>item.depth)),lateFailureDepth=Math.max(0,...decoys.map(item=>puzzle.delay+item.depth-1)),collision=collisionPressure(puzzle),score=puzzle.turns*3+decoys.length*15+deepTraps*18+shortcutDecoys*12+lateFailureDepth*5+cfg.loopMoves*7+collision*2;
  return{decisionPoints:decoys.length+1,delayedTraps:decoys.length,deepTraps,shortcutDecoys,maxFalseRouteDepth,lateFailureDepth,goalReentry:true,reentryMoves:cfg.loopMoves,collisionPressure:collision,score};
}
function buildTemporalCandidate(cfg,difficulty,seed,attempt){
  const built=buildTemporalRoute(cfg,seed,attempt);if(!built)return null;
  const{route,actions,dr,dc,rng}=built,candidates=decoyPathCandidates({cfg,route,dr,dc,rng}),decoys=selectTemporalDecoys(cfg,candidates);
  if(decoys.length<cfg.decoys)return null;
  const walls=buildTemporalWalls({cfg,route,decoys,dr,dc}),playerStart=route[0],playerGoal=route.at(-1),echoStart=translated(playerStart,cfg.size,dr,dc),echoGoal=translated(route[route.length-1-cfg.delay],cfg.size,dr,dc);
  const puzzle={size:cfg.size,delay:cfg.delay,...walls,playerStart,echoStart,playerGoal,echoGoal,solution:[...actions],solutionMoves:actions.length,difficulty,seed,offset:{dr,dc},turns:countTurns(actions),phaseVersion:2,generatorVersion:4,temporal:null};
  if(!simulateEchoStep(puzzle,puzzle.solution).solved)return null;
  puzzle.temporal=temporalMetrics(puzzle,decoys,cfg);
  return puzzle;
}
function temporalGate(puzzle,cfg,difficulty){
  const t=puzzle.temporal;if(!t||!t.goalReentry||puzzle.solutionMoves<cfg.totalMoves||puzzle.turns<cfg.minTurns||t.delayedTraps<cfg.decoys||t.deepTraps<cfg.deepTraps)return false;
  if(difficulty==='hard')return t.decisionPoints>=7&&t.shortcutDecoys>=2&&t.lateFailureDepth>=6;
  return t.decisionPoints>=5&&t.shortcutDecoys>=1&&t.lateFailureDepth>=4;
}
function generateTemporalEchoStep(cfg,difficulty,seed){
  let best=null;
  for(let attempt=0;attempt<cfg.candidateBudget;attempt++){
    const puzzle=buildTemporalCandidate(cfg,difficulty,seed,attempt);if(!puzzle)continue;
    if(!best||puzzle.temporal.score>best.temporal.score)best=puzzle;
    if(temporalGate(puzzle,cfg,difficulty))return puzzle;
  }
  if(best&&best.temporal.delayedTraps>=cfg.decoys&&best.temporal.deepTraps>=cfg.deepTraps)return best;
  throw new Error(`Echo Step ${difficulty} temporal generator exhausted its bounded candidate budget.`);
}

export function generateEchoStep(difficulty='easy',seed='echo-step'){
  const cfg=LEVEL[difficulty]||LEVEL.easy;
  return difficulty==='easy'?generateEasyEchoStep(cfg,difficulty,seed):generateTemporalEchoStep(cfg,difficulty,seed);
}
