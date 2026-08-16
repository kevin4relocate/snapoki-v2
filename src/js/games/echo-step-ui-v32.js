import {generateEchoStep,advanceEchoState,forecastEchoStep} from './echo-step-core.js';
import {scoreFromPerformance,scoreTimeDivisor,rcOf} from './utils.js';

const DIRS={u:{label:'Up',arrow:'↑'},r:{label:'Right',arrow:'→'},d:{label:'Down',arrow:'↓'},l:{label:'Left',arrow:'←'}};
const HINT_LOOKAHEAD=3;

function targetFor(index,size,action){
  const[row,col]=rcOf(index,size);
  if(action==='u')return row>0?index-size:-1;
  if(action==='r')return col<size-1?index+1:-1;
  if(action==='d')return row<size-1?index+size:-1;
  if(action==='l')return col>0?index-1:-1;
  return-1;
}
function bothHome(puzzle,state){return state.player===puzzle.playerGoal&&state.echo===puzzle.echoGoal;}
function arrows(actions){return actions.map(action=>DIRS[action]?.arrow||'').filter(Boolean).join(' ');}
function routeSet(start,actions,size){const cells=new Set([start]);let pos=start;for(const action of actions){pos=targetFor(pos,size,action);if(pos>=0)cells.add(pos);}return cells;}
function stepGuide(steps){const guide=new Map();for(const step of steps)guide.set(step.from,{arrow:DIRS[step.action]?.arrow||'',step:step.turn});return guide;}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateEchoStep(difficulty,seed),timeDivisor=scoreTimeDivisor('echo-step',difficulty),sharedBlocked=new Set(puzzle.blocked),playerPhase=new Set(puzzle.playerBarriers),echoPhase=new Set(puzzle.echoBarriers);
  let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]},moves=0,actions=[],hintActions=[],hintForecast=null,hintAtMove=-1,solutionVisible=false,practice=false,complete=false,failed=false,failureMessage='';
  const echoPracticeActions=puzzle.solution.slice(0,Math.max(0,puzzle.solution.length-puzzle.delay)),solutionPlayerCells=routeSet(puzzle.playerStart,puzzle.solution,puzzle.size),solutionEchoCells=routeSet(puzzle.echoStart,echoPracticeActions,puzzle.size);

  host.innerHTML=`<div class="echo-stage"><div class="echo-legend"><span class="echo-legend-item echo-legend-player"><i class="echo-dot echo-dot-player"></i><b>YOU</b><small>purple · you control this</small></span><span class="echo-legend-item echo-legend-ghost"><i class="echo-dot echo-dot-ghost"></i><b>ECHO</b><small>cyan · ${puzzle.delay} moves behind</small></span></div><div class="echo-phase-legend" aria-label="Phase wall rules"><span class="phase-chip phase-chip-player" title="Purple-striped cells block YOU only. Echo can cross them."><i>Y</i><span><b>Purple stripes</b><small>YOU blocked</small></span></span><span class="phase-chip phase-chip-echo" title="Cyan-striped cells block Echo only. YOU can cross them."><i>E</i><span><b>Cyan stripes</b><small>Echo blocked</small></span></span><span class="phase-chip phase-chip-shared" title="Dark-striped cells block both YOU and Echo."><i>■</i><span><b>Dark stripes</b><small>both blocked</small></span></span></div><div class="echo-state-banner" role="status" aria-live="polite" hidden></div><div class="echo-grid" style="--grid-size:${puzzle.size}" role="grid" aria-label="Echo Step board"></div><div class="echo-timeline"><span>Echo memory</span><div class="echo-queue" aria-live="polite"></div></div><div class="echo-sequence" hidden></div></div>`;
  const grid=host.querySelector('.echo-grid'),queue=host.querySelector('.echo-queue'),sequence=host.querySelector('.echo-sequence'),banner=host.querySelector('.echo-state-banner');
  for(let i=0;i<puzzle.size*puzzle.size;i++){const cell=document.createElement('button');cell.type='button';cell.className='echo-cell';cell.dataset.index=String(i);cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`Row ${Math.floor(i/puzzle.size)+1}, column ${i%puzzle.size+1}`);grid.appendChild(cell);}

  function clearHint(){hintActions=[];hintForecast=null;hintAtMove=-1;}
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
    if(failed)return'<small class="echo-memory-failed">Timeline failed · reset to retry</small>';
    if(!state.pending.length)return`<small>Echo starts after ${puzzle.delay} moves</small>`;
    const preview=nextEchoPreview();
    return state.pending.map((action,index)=>`<b class="${preview.ready&&index===0?'is-next':''} ${preview.ready&&preview.danger&&index===0?'is-danger':''}" aria-label="${preview.ready&&index===0?'Next Echo move: ':''}${DIRS[action].label}">${preview.ready&&index===0?'<em>NEXT</em>':''}<span>${DIRS[action].arrow}</span></b>`).join('');
  }
  function solutionTimeline(){
    const turns=puzzle.solution.map((action,index)=>{const echoAction=index>=puzzle.delay?puzzle.solution[index-puzzle.delay]:'';return`<div class="echo-solution-turn"><em>${index+1}</em><span class="echo-solution-you" title="YOU: ${DIRS[action].label}">${DIRS[action].arrow}</span><span class="echo-solution-echo ${echoAction?'':'is-waiting'}" title="${echoAction?`Echo replays: ${DIRS[echoAction].label}`:'Echo has not started yet'}">${echoAction?DIRS[echoAction].arrow:'·'}</span></div>`;}).join('');
    return`<div class="echo-solution-guide"><div class="echo-solution-heading"><div><b>Solution timeline</b><small>Read left → right. Echo repeats the same commands ${puzzle.delay} turns later.</small></div><span>SYNC on turn ${puzzle.solution.length}</span></div><div class="echo-solution-key"><span>TURN</span><b>YOU</b><b>ECHO</b></div><div class="echo-solution-scroll">${turns}</div><p>Follow the purple row now. The cyan row shows what Echo performs on that same turn. The final turn is successful only when YOU is on P and Echo is on E together.</p></div>`;
  }
  function renderSequence(){
    if(solutionVisible)return solutionTimeline();
    if(!hintActions.length||!hintForecast)return'';
    const echoMoves=hintForecast.echoSteps.map(step=>step.action).filter(Boolean),echoCopy=echoMoves.length?`replays ${arrows(echoMoves)}`:`still waiting (${Math.max(0,puzzle.delay-state.pending.length)} turn${Math.max(0,puzzle.delay-state.pending.length)===1?'':'s'} to first replay)`;
    return`<b>3-move hint</b><span class="echo-hint-sequence-player">YOU: ${arrows(hintActions)}</span><span class="echo-hint-sequence-echo">ECHO: ${echoCopy}</span><small>Purple numbers are your next turns. Cyan E-numbers show only the Echo moves that replay during this forecast.</small>`;
  }
  function renderBanner(){
    banner.hidden=false;
    if(failed){banner.className='echo-state-banner is-failed';banner.innerHTML=`<div><strong>Timeline failed</strong><span>${failureMessage} This run cannot continue.</span></div><button type="button" data-echo-reset>Reset Puzzle</button>`;return;}
    if(complete){banner.className='echo-state-banner is-synced';banner.innerHTML='<div><strong>SYNC complete</strong><span>YOU and Echo reached P and E on the same turn.</span></div>';return;}
    if(state.player===puzzle.playerGoal){banner.className='echo-state-banner is-waiting-player';banner.innerHTML='<div><strong>YOU reached P — not solved yet</strong><span>Echo must reach E on the same turn. Keep moving, then return to P at the right time.</span></div>';return;}
    if(state.echo===puzzle.echoGoal){banner.className='echo-state-banner is-waiting-echo';banner.innerHTML='<div><strong>Echo reached E — not solved yet</strong><span>YOU must reach P on the same turn. Time your arrival with Echo.</span></div>';return;}
    banner.hidden=true;banner.className='echo-state-banner';banner.innerHTML='';
  }
  function render(){
    const echoPreview=nextEchoPreview(),hintPlayerGuide=hintForecast?stepGuide(hintForecast.playerSteps):new Map(),hintEchoGuide=hintForecast?stepGuide(hintForecast.echoSteps):new Map();
    grid.querySelectorAll('.echo-cell').forEach(cell=>{
      const index=Number(cell.dataset.index);cell.className='echo-cell';cell.title='';
      if(sharedBlocked.has(index)){cell.classList.add('blocked','shared-blocked');cell.title='Dark-striped wall: blocks both YOU and Echo.';}
      if(playerPhase.has(index)){cell.classList.add('barrier-player');cell.title='Purple-striped wall: YOU cannot enter; Echo can cross.';}
      if(echoPhase.has(index)){cell.classList.add('barrier-echo');cell.title='Cyan-striped wall: Echo cannot enter; YOU can cross.';}
      if(solutionVisible&&solutionPlayerCells.has(index))cell.classList.add('solution-player');
      if(solutionVisible&&solutionEchoCells.has(index))cell.classList.add('solution-echo');
      if(index===puzzle.playerGoal)cell.classList.add('player-goal');if(index===puzzle.echoGoal)cell.classList.add('echo-goal');if(index===state.player)cell.classList.add('has-player');if(index===state.echo)cell.classList.add('has-echo');if(index===puzzle.playerGoal&&state.player===puzzle.playerGoal&&!bothHome(puzzle,state))cell.classList.add('goal-waiting');if(index===puzzle.echoGoal&&state.echo===puzzle.echoGoal&&!bothHome(puzzle,state))cell.classList.add('goal-waiting');if(echoPreview.ready&&index===echoPreview.target)cell.classList.add('echo-next-target',...(echoPreview.danger?['echo-next-danger']:[]));
      cell.disabled=sharedBlocked.has(index)||playerPhase.has(index)||complete||failed;cell.innerHTML='';
      addPhaseMarker(cell,index);addHintGuide(cell,hintPlayerGuide,'player');addHintGuide(cell,hintEchoGuide,'echo');
      if(echoPreview.ready&&index===echoPreview.target){const next=document.createElement('span');next.className='echo-next-marker';next.textContent=echoPreview.danger?'!':'E';next.setAttribute('aria-hidden','true');cell.appendChild(next);}
      if(index===puzzle.playerGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-player';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===puzzle.echoGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-ghost';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===state.player){const token=document.createElement('span');token.className='echo-agent echo-agent-player';token.textContent='YOU';cell.appendChild(token);}if(index===state.echo){const token=document.createElement('span');token.className='echo-agent echo-agent-ghost';token.textContent='E';cell.appendChild(token);}
    });
    queue.innerHTML=renderQueue();const sequenceHtml=renderSequence();sequence.hidden=!sequenceHtml;sequence.classList.toggle('is-solution-timeline',solutionVisible);sequence.innerHTML=sequenceHtml;renderBanner();onMetrics({moves,delay:puzzle.delay});
  }
  function fail(message){failed=true;failureMessage=message;clearHint();render();onStatus(`${message} Timeline failed. Reset Puzzle to try again.`);}
  function finish(){complete=true;clearHint();host.classList.add('game-solved-bloom');render();if(practice){onStatus('');onPracticeComplete('Echo Step practice complete. YOU and Echo reached both goals on the same turn.');}else{onStatus('Synced! YOU and Echo reached home on the same turn.');onComplete();}}
  function move(action){
    if(complete||failed||!DIRS[action])return false;
    const next=advanceEchoState(puzzle,state,action);if(!next.ok){if(next.playerBlocked){onStatus(next.reason);return false;}fail(next.reason);return false;}
    state=next.state;moves++;actions.push(action);clearHint();render();
    if(bothHome(puzzle,state)){finish();return true;}
    if(state.player===puzzle.playerGoal){onStatus('YOU are on the purple goal, but Echo is not home yet. Keep moving and time your return.');return true;}
    if(state.echo===puzzle.echoGoal){onStatus('Echo is on the cyan goal, but YOU are not home yet. Time your arrival with Echo.');return true;}
    onStatus(state.pending.length<puzzle.delay?`Echo starts after ${puzzle.delay-state.pending.length} more move${puzzle.delay-state.pending.length===1?'':'s'}.`:'Echo is replaying your past moves. Purple stripes block YOU; cyan stripes block Echo; dark stripes block both.');
    return true;
  }
  function directionTo(index){if(index<0||index>=puzzle.size*puzzle.size)return'';const[pr,pc]=rcOf(state.player,puzzle.size),[tr,tc]=rcOf(index,puzzle.size);if(Math.abs(pr-tr)+Math.abs(pc-tc)!==1)return'';return tr<pr?'u':tr>pr?'d':tc<pc?'l':'r';}

  grid.addEventListener('click',event=>{const cell=event.target.closest('.echo-cell');if(cell)move(directionTo(Number(cell.dataset.index)));});
  banner.addEventListener('click',event=>{if(event.target.closest('[data-echo-reset]'))document.querySelector('#resetPuzzle')?.click();});
  const keyHandler=event=>{if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||''))return;const map={ArrowUp:'u',w:'u',W:'u',ArrowRight:'r',d:'r',D:'r',ArrowDown:'d',s:'d',S:'d',ArrowLeft:'l',a:'l',A:'l'},action=map[event.key];if(action){event.preventDefault();move(action);}};window.addEventListener('keydown',keyHandler);

  function resetState({keepPractice=false,keepSolution=false}={}){host.classList.remove('game-solved-bloom');state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};moves=0;actions=[];clearHint();solutionVisible=keepSolution;practice=keepPractice;complete=false;failed=false;failureMessage='';render();onStatus(keepSolution?`Solution timeline is on. Read each turn left to right: YOU now, Echo ${puzzle.delay} turns later.`:`Move purple YOU by keyboard/WASD or click an adjacent cell. Echo copies you ${puzzle.delay} moves later. Sync P and E on the same turn.`);}
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
      const echoMoves=hintForecast.echoSteps.map(step=>step.action).filter(Boolean),echoMessage=echoMoves.length?`Echo will replay ${arrows(echoMoves)} during those turns.`:'Echo is still storing moves; it will not replay during this short forecast yet.';
      onStatus(`3-move route hint: ${arrows(hintActions)}. ${echoMessage}`);return true;
    },
    solution(){if(complete)return;resetState({keepPractice:true,keepSolution:true});},
    hideSolution(){if(complete)return;solutionVisible=false;render();onStatus('');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190}),metadata:{moves,size:puzzle.size,delay:puzzle.delay,solution_moves:puzzle.solutionMoves,actions:[...actions]}};},
    destroy(){window.removeEventListener('keydown',keyHandler);host.classList.remove('game-solved-bloom');}
  };
}
