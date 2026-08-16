import {rngFromSeed,scoreFromPerformance,scoreTimeDivisor,orthogonalNeighbors,rcOf,indexOf} from './utils.js';

const DIRS={u:{dr:-1,dc:0,label:'Up',arrow:'↑'},r:{dr:0,dc:1,label:'Right',arrow:'→'},d:{dr:1,dc:0,label:'Down',arrow:'↓'},l:{dr:0,dc:-1,label:'Left',arrow:'←'}};
const LEVEL={
  easy:{size:6,delay:2,minMoves:8,maxMoves:11,shared:2,playerPhase:2,echoPhase:2,minTurns:3},
  medium:{size:8,delay:3,minMoves:14,maxMoves:19,shared:4,playerPhase:5,echoPhase:5,minTurns:6},
  hard:{size:10,delay:4,minMoves:22,maxMoves:30,shared:8,playerPhase:10,echoPhase:10,minTurns:10}
};
const HINT_LOOKAHEAD=3;

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

function routeGuide(start,actions,size){
  const guide=new Map();let pos=start;
  actions.forEach((action,index)=>{guide.set(pos,{arrow:DIRS[action].arrow,step:index+1,goal:false});pos=targetFor(pos,size,action);});
  guide.set(pos,{arrow:'',step:actions.length+1,goal:true});
  return guide;
}
function stepGuide(steps){const guide=new Map();for(const step of steps)guide.set(step.from,{arrow:DIRS[step.action]?.arrow||'',step:step.turn});return guide;}
function showRouteStep(step,goal){return goal||step===1||step%5===0;}
function arrows(actions){return actions.map(action=>DIRS[action]?.arrow||'').filter(Boolean).join(' ');}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateEchoStep(difficulty,seed),timeDivisor=scoreTimeDivisor('echo-step',difficulty),sharedBlocked=new Set(puzzle.blocked),playerPhase=new Set(puzzle.playerBarriers),echoPhase=new Set(puzzle.echoBarriers);
  let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]},moves=0,actions=[],hintActions=[],hintForecast=null,hintAtMove=-1,solutionVisible=false,practice=false,complete=false,failed=false;
  host.innerHTML=`<div class="echo-stage"><div class="echo-legend"><span class="echo-legend-item echo-legend-player"><i class="echo-dot echo-dot-player"></i><b>YOU</b><small>purple · you control this</small></span><span class="echo-legend-item echo-legend-ghost"><i class="echo-dot echo-dot-ghost"></i><b>ECHO</b><small>cyan · ${puzzle.delay} moves behind</small></span></div><div class="echo-phase-legend" aria-label="Phase wall rules"><span class="phase-chip phase-chip-player"><i>Y</i>Purple wall blocks YOU</span><span class="phase-chip phase-chip-echo"><i>E</i>Cyan wall blocks Echo</span><span class="phase-chip phase-chip-shared"><i>■</i>Dark wall blocks both</span></div><div class="echo-grid" style="--grid-size:${puzzle.size}" role="grid" aria-label="Echo Step board"></div><div class="echo-timeline"><span>Echo memory</span><div class="echo-queue" aria-live="polite"></div></div><div class="echo-controls" aria-label="Movement controls"><span></span><button type="button" data-echo-move="u" aria-label="Move up">↑</button><span></span><button type="button" data-echo-move="l" aria-label="Move left">←</button><button type="button" data-echo-move="d" aria-label="Move down">↓</button><button type="button" data-echo-move="r" aria-label="Move right">→</button></div><div class="echo-sequence" hidden></div></div>`;
  const grid=host.querySelector('.echo-grid'),queue=host.querySelector('.echo-queue'),sequence=host.querySelector('.echo-sequence');
  for(let i=0;i<puzzle.size*puzzle.size;i++){const cell=document.createElement('button');cell.type='button';cell.className='echo-cell';cell.dataset.index=String(i);cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`Row ${Math.floor(i/puzzle.size)+1}, column ${i%puzzle.size+1}`);grid.appendChild(cell);}
  const echoPracticeActions=puzzle.solution.slice(0,Math.max(0,puzzle.solution.length-puzzle.delay)),solutionPlayerGuide=routeGuide(puzzle.playerStart,puzzle.solution,puzzle.size),solutionEchoGuide=routeGuide(puzzle.echoStart,echoPracticeActions,puzzle.size);
  function clearHint(){hintActions=[];hintForecast=null;hintAtMove=-1;}
  function addRouteGuide(cell,guide,kind){
    if(!solutionVisible)return;
    const marker=guide.get(Number(cell.dataset.index));if(!marker)return;
    cell.classList.add(kind==='player'?'solution-player':'solution-echo');
    if(marker.arrow){const arrow=document.createElement('span');arrow.className=`echo-route-arrow echo-route-arrow-${kind}`;arrow.textContent=marker.arrow;arrow.setAttribute('aria-hidden','true');cell.appendChild(arrow);}
    if(showRouteStep(marker.step,marker.goal)){const step=document.createElement('span');step.className=`echo-route-step echo-route-step-${kind}`;step.textContent=marker.goal?'SYNC':String(marker.step);step.setAttribute('aria-hidden','true');cell.appendChild(step);}
  }
  function addHintGuide(cell,guide,kind){
    if(solutionVisible||!hintActions.length)return;
    const marker=guide.get(Number(cell.dataset.index));if(!marker)return;
    cell.classList.add(kind==='player'?'hint-player':'hint-echo');
    const arrow=document.createElement('span');arrow.className=`echo-hint-arrow echo-hint-arrow-${kind}`;arrow.textContent=marker.arrow;arrow.setAttribute('aria-hidden','true');cell.appendChild(arrow);
    const step=document.createElement('span');step.className=`echo-hint-step echo-hint-step-${kind}`;step.textContent=kind==='player'?String(marker.step):`E${marker.step}`;step.setAttribute('aria-hidden','true');cell.appendChild(step);
  }
  function addPhaseMarker(cell,index){
    if(playerPhase.has(index)){const marker=document.createElement('span');marker.className='echo-phase-wall echo-phase-wall-player';marker.textContent='Y';marker.setAttribute('aria-hidden','true');cell.appendChild(marker);}
    if(echoPhase.has(index)){const marker=document.createElement('span');marker.className='echo-phase-wall echo-phase-wall-echo';marker.textContent='E';marker.setAttribute('aria-hidden','true');cell.appendChild(marker);}
  }
  function nextEchoPreview(){
    if(state.pending.length!==puzzle.delay)return{ready:false,action:'',target:-1,danger:false};
    const action=state.pending[0],target=targetFor(state.echo,puzzle.size,action),danger=target<0||sharedBlocked.has(target)||echoPhase.has(target)||target===state.player;
    return{ready:true,action,target,danger};
  }
  function renderQueue(){
    if(complete)return'<small class="echo-sync-done">✓ Synced on this turn</small>';
    if(!state.pending.length)return`<small>Echo starts after ${puzzle.delay} moves</small>`;
    const preview=nextEchoPreview();
    return state.pending.map((action,index)=>`<b class="${preview.ready&&index===0?'is-next':''} ${preview.ready&&preview.danger&&index===0?'is-danger':''}" aria-label="${preview.ready&&index===0?'Next Echo move: ':''}${DIRS[action].label}">${preview.ready&&index===0?'<em>NEXT</em>':''}<span>${DIRS[action].arrow}</span></b>`).join('');
  }
  function renderSequence(){
    if(solutionVisible)return`<b>Route guide</b><span class="echo-sequence-player">YOU: purple arrows · avoid purple + dark walls</span><span class="echo-sequence-ghost">ECHO: cyan arrows · avoid cyan + dark walls</span><small>Same commands, different barriers, ${puzzle.delay}-turn delay · both must land on SYNC together.</small>`;
    if(!hintActions.length||!hintForecast)return'';
    const echoMoves=hintForecast.echoSteps.map(step=>step.action).filter(Boolean),echoCopy=echoMoves.length?`replays ${arrows(echoMoves)}`:`still waiting (${Math.max(0,puzzle.delay-state.pending.length)} turn${Math.max(0,puzzle.delay-state.pending.length)===1?'':'s'} to first replay)`;
    return`<b>3-move hint</b><span class="echo-hint-sequence-player">YOU: ${arrows(hintActions)}</span><span class="echo-hint-sequence-echo">ECHO: ${echoCopy}</span><small>Follow only this short forecast. Purple numbers are your next turns; cyan E-numbers show Echo moves that actually replay during them.</small>`;
  }
  function render(){
    const echoPreview=nextEchoPreview(),hintPlayerGuide=hintForecast?stepGuide(hintForecast.playerSteps):new Map(),hintEchoGuide=hintForecast?stepGuide(hintForecast.echoSteps):new Map();
    grid.querySelectorAll('.echo-cell').forEach(cell=>{
      const index=Number(cell.dataset.index);cell.className='echo-cell';
      if(sharedBlocked.has(index))cell.classList.add('blocked','shared-blocked');
      if(playerPhase.has(index))cell.classList.add('barrier-player');
      if(echoPhase.has(index))cell.classList.add('barrier-echo');
      if(index===puzzle.playerGoal)cell.classList.add('player-goal');if(index===puzzle.echoGoal)cell.classList.add('echo-goal');if(index===state.player)cell.classList.add('has-player');if(index===state.echo)cell.classList.add('has-echo');if(index===puzzle.playerGoal&&state.player===puzzle.playerGoal&&!bothHome(puzzle,state))cell.classList.add('goal-waiting');if(index===puzzle.echoGoal&&state.echo===puzzle.echoGoal&&!bothHome(puzzle,state))cell.classList.add('goal-waiting');if(echoPreview.ready&&index===echoPreview.target)cell.classList.add('echo-next-target',...(echoPreview.danger?['echo-next-danger']:[]));
      cell.disabled=sharedBlocked.has(index)||playerPhase.has(index)||complete||failed;cell.innerHTML='';
      addPhaseMarker(cell,index);addRouteGuide(cell,solutionPlayerGuide,'player');addRouteGuide(cell,solutionEchoGuide,'echo');addHintGuide(cell,hintPlayerGuide,'player');addHintGuide(cell,hintEchoGuide,'echo');
      if(echoPreview.ready&&index===echoPreview.target){const next=document.createElement('span');next.className='echo-next-marker';next.textContent=echoPreview.danger?'!':'E';next.setAttribute('aria-hidden','true');cell.appendChild(next);}
      if(index===puzzle.playerGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-player';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===puzzle.echoGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-ghost';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===state.player){const token=document.createElement('span');token.className='echo-agent echo-agent-player';token.textContent='YOU';cell.appendChild(token);}if(index===state.echo){const token=document.createElement('span');token.className='echo-agent echo-agent-ghost';token.textContent='E';cell.appendChild(token);}
    });
    queue.innerHTML=renderQueue();const sequenceHtml=renderSequence();sequence.hidden=!sequenceHtml;sequence.innerHTML=sequenceHtml;host.querySelectorAll('[data-echo-move]').forEach(button=>button.disabled=complete||failed);onMetrics({moves,delay:puzzle.delay});
  }
  function fail(message){failed=true;clearHint();render();onStatus(`${message} Timeline broke — Reset Puzzle to try again.`);}
  function finish(){complete=true;clearHint();host.classList.add('game-solved-bloom');render();if(practice){onStatus('');onPracticeComplete('Echo Step practice complete. YOU and Echo reached both goals on the same turn.');}else{onStatus('Synced! YOU and Echo reached home on the same turn.');onComplete();}}
  function move(action){
    if(complete||failed||!DIRS[action])return false;
    const next=advanceEchoState(puzzle,state,action);if(!next.ok){if(next.playerBlocked){onStatus(next.reason);return false;}fail(next.reason);return false;}
    state=next.state;moves++;actions.push(action);clearHint();render();
    if(bothHome(puzzle,state)){finish();return true;}
    if(state.player===puzzle.playerGoal){onStatus('YOU are on the purple goal, but Echo is not home yet. Keep moving and time your return.');return true;}
    if(state.echo===puzzle.echoGoal){onStatus('Echo is on the cyan goal, but YOU are not home yet. Time your arrival with Echo.');return true;}
    onStatus(state.pending.length<puzzle.delay?`Echo starts after ${puzzle.delay-state.pending.length} more move${puzzle.delay-state.pending.length===1?'':'s'}.`:'Echo is replaying your past moves. Remember: purple walls block YOU; cyan walls block Echo.');
    return true;
  }
  function directionTo(index){if(index<0||index>=puzzle.size*puzzle.size)return'';const[pr,pc]=rcOf(state.player,puzzle.size),[tr,tc]=rcOf(index,puzzle.size);if(Math.abs(pr-tr)+Math.abs(pc-tc)!==1)return'';return tr<pr?'u':tr>pr?'d':tc<pc?'l':'r';}
  grid.addEventListener('click',event=>{const cell=event.target.closest('.echo-cell');if(cell)move(directionTo(Number(cell.dataset.index)));});host.querySelector('.echo-controls').addEventListener('click',event=>{const button=event.target.closest('[data-echo-move]');if(button)move(button.dataset.echoMove);});
  const keyHandler=event=>{if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||''))return;const map={ArrowUp:'u',w:'u',W:'u',ArrowRight:'r',d:'r',D:'r',ArrowDown:'d',s:'d',S:'d',ArrowLeft:'l',a:'l',A:'l'},action=map[event.key];if(action){event.preventDefault();move(action);}};window.addEventListener('keydown',keyHandler);
  function resetState({keepPractice=false,keepSolution=false}={}){host.classList.remove('game-solved-bloom');state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};moves=0;actions=[];clearHint();solutionVisible=keepSolution;practice=keepPractice;complete=false;failed=false;render();onStatus(keepSolution?'Practice route is on. Purple and cyan arrows show the same commands at different times.':`Move purple YOU. Echo copies you ${puzzle.delay} moves later. Purple walls block YOU; cyan walls block Echo. Sync both goals.`);}
  resetState();
  return{
    supportsUndo:false,
    reset(){resetState();},
    hint(){
      if(complete||failed||solutionVisible)return false;
      const prefix=actions.every((action,index)=>puzzle.solution[index]===action);
      if(!prefix||actions.length>=puzzle.solution.length){onStatus('This route has left the guided path. Reset Puzzle if you want a route hint.');return false;}
      if(hintAtMove===actions.length&&hintActions.length){onStatus('Your 3-move forecast is already on the board. Make a move to advance the hint.');return false;}
      hintActions=puzzle.solution.slice(actions.length,actions.length+HINT_LOOKAHEAD);hintForecast=forecastEchoStep(puzzle,state,hintActions);hintAtMove=actions.length;
      if(!hintForecast.ok){clearHint();onStatus('The guided timeline is unavailable from this position. Reset Puzzle and try again.');return false;}
      render();
      const echoMoves=hintForecast.echoSteps.map(step=>step.action).filter(Boolean),echoMessage=echoMoves.length?`Echo will replay ${arrows(echoMoves)} during those turns.`:`Echo is still storing moves; it will not replay during this short forecast yet.`;
      onStatus(`3-move route hint: ${arrows(hintActions)}. ${echoMessage}`);return true;
    },
    solution(){if(complete)return;resetState({keepPractice:true,keepSolution:true});},
    hideSolution(){if(complete)return;solutionVisible=false;render();onStatus('');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190}),metadata:{moves,size:puzzle.size,delay:puzzle.delay,solution_moves:puzzle.solutionMoves,actions:[...actions]}};},
    destroy(){window.removeEventListener('keydown',keyHandler);host.classList.remove('game-solved-bloom');}
  };
}
