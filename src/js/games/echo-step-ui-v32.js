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
function stepGuide(steps){const guide=new Map();for(const step of steps)guide.set(step.from,{arrow:DIRS[step.action]?.arrow||'',step:step.turn});return guide;}
function friendlyFailure(message){
  if(message==='Echo hit a cyan phase wall.')return'Echo hit a cyan wall.';
  if(message==='Echo hit a dark wall.')return'Echo hit a dark wall.';
  if(message==='Echo left the board.')return'Echo moved off the board.';
  return message;
}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateEchoStep(difficulty,seed),timeDivisor=scoreTimeDivisor('echo-step',difficulty),sharedBlocked=new Set(puzzle.blocked),playerPhase=new Set(puzzle.playerBarriers),echoPhase=new Set(puzzle.echoBarriers),feedbackTimers=new Set();
  let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]},moves=0,actions=[],hintActions=[],hintForecast=null,hintAtMove=-1,solutionVisible=false,practice=false,complete=false,failed=false,failureMessage='',practiceMessage='';

  host.innerHTML=`<div class="echo-stage"><div class="echo-compact-bar"><span class="echo-compact-you"><i></i><b>YOU</b></span><span class="echo-copy-mark">→</span><span class="echo-compact-echo"><i></i><b>ECHO</b><small>${puzzle.delay}-turn delay</small></span><details class="echo-rules"><summary>Walls</summary><div class="echo-rules-popover"><span><i class="wall-swatch wall-swatch-you"></i><b>Purple</b><small><strong>YOU ✕</strong><em>ECHO ✓</em></small></span><span><i class="wall-swatch wall-swatch-echo"></i><b>Cyan</b><small><em>YOU ✓</em><strong>ECHO ✕</strong></small></span><span><i class="wall-swatch wall-swatch-both"></i><b>Dark</b><small><strong>YOU ✕</strong><strong>ECHO ✕</strong></small></span><p>✕ cannot enter · ✓ can pass through</p></div></details></div><div class="echo-board-shell"><div class="echo-state-banner" role="status" aria-live="polite" hidden></div><div class="echo-grid" style="--grid-size:${puzzle.size}" role="grid" aria-label="Echo Step board"></div></div><div class="echo-timeline"><span>Echo memory</span><div class="echo-queue" aria-live="polite"></div></div><div class="echo-sequence" hidden></div></div>`;
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
  function nextEchoPreview(){
    if(state.pending.length!==puzzle.delay)return{ready:false,action:'',target:-1,danger:false};
    const action=state.pending[0],target=targetFor(state.echo,puzzle.size,action),danger=target<0||sharedBlocked.has(target)||echoPhase.has(target)||target===state.player;
    return{ready:true,action,target,danger};
  }
  function practiceStep(){
    if(!solutionVisible||complete)return null;
    const index=actions.length,action=puzzle.solution[index];
    if(!action)return null;
    const playerTarget=targetFor(state.player,puzzle.size,action),echoAction=state.pending.length===puzzle.delay?state.pending[0]:'',echoTarget=echoAction?targetFor(state.echo,puzzle.size,echoAction):-1;
    return{index,action,playerTarget,echoAction,echoTarget};
  }
  function flashCell(index,className){
    const cell=grid.querySelector(`.echo-cell[data-index="${index}"]`);if(!cell)return;
    cell.classList.remove(className);void cell.offsetWidth;cell.classList.add(className);
    const timer=setTimeout(()=>{cell.classList.remove(className);feedbackTimers.delete(timer);},260);feedbackTimers.add(timer);
  }
  function renderQueue(){
    if(complete)return'<small class="echo-sync-done">✓ Synced</small>';
    if(!state.pending.length)return`<small>Echo starts after ${puzzle.delay} moves</small>`;
    const preview=nextEchoPreview();
    return state.pending.map((action,index)=>`<b class="${preview.ready&&index===0?'is-next':''} ${preview.ready&&preview.danger&&index===0?'is-danger':''}" aria-label="${preview.ready&&index===0?'Next Echo move: ':''}${DIRS[action].label}">${preview.ready&&index===0?'<em>NEXT</em>':''}<span>${DIRS[action].arrow}</span></b>`).join('');
  }
  function renderSequence(){
    if(solutionVisible)return'';
    if(!hintActions.length||!hintForecast)return'';
    const echoMoves=hintForecast.echoSteps.map(step=>step.action).filter(Boolean),echoCopy=echoMoves.length?`replays ${arrows(echoMoves)}`:`still waiting (${Math.max(0,puzzle.delay-state.pending.length)} turn${Math.max(0,puzzle.delay-state.pending.length)===1?'':'s'})`;
    return`<b>3-move hint</b><span class="echo-hint-sequence-player">YOU: ${arrows(hintActions)}</span><span class="echo-hint-sequence-echo">ECHO: ${echoCopy}</span><small>Purple numbers are your next moves. Cyan markers show what Echo replays during them.</small>`;
  }
  function renderBanner(){
    banner.hidden=false;
    if(failed){banner.className='echo-state-banner is-failed';banner.innerHTML=`<div><strong>Timeline failed</strong><span>${failureMessage}</span></div><button type="button" data-echo-reset>Retry</button>`;return;}
    const guide=practiceStep();
    if(guide){const echoCopy=guide.echoAction?`${DIRS[guide.echoAction].arrow} ${DIRS[guide.echoAction].label}`:'waits';banner.className='echo-state-banner is-practice';banner.innerHTML=`<div><strong>Guide · ${guide.index+1}/${puzzle.solution.length}</strong><span>${practiceMessage||`YOU ${DIRS[guide.action].arrow} · Echo ${echoCopy}`}</span></div>`;return;}
    if(state.player===puzzle.playerGoal&&!complete){banner.className='echo-state-banner is-waiting-player';banner.innerHTML='<div><strong>P reached — sync missing</strong><span>Get Echo onto E on the same turn.</span></div>';return;}
    if(state.echo===puzzle.echoGoal&&!complete){banner.className='echo-state-banner is-waiting-echo';banner.innerHTML='<div><strong>Echo reached E — sync missing</strong><span>Get YOU onto P on the same turn.</span></div>';return;}
    banner.hidden=true;banner.className='echo-state-banner';banner.innerHTML='';
  }
  function render(){
    const echoPreview=nextEchoPreview(),guide=practiceStep(),hintPlayerGuide=hintForecast?stepGuide(hintForecast.playerSteps):new Map(),hintEchoGuide=hintForecast?stepGuide(hintForecast.echoSteps):new Map();
    grid.querySelectorAll('.echo-cell').forEach(cell=>{
      const index=Number(cell.dataset.index);cell.className='echo-cell';cell.title='';
      if(sharedBlocked.has(index)){cell.classList.add('blocked','shared-blocked');cell.title='Dark wall: YOU and Echo cannot enter.';}
      if(playerPhase.has(index)){cell.classList.add('barrier-player');cell.title='Purple wall: YOU cannot enter; Echo can pass through.';}
      if(echoPhase.has(index)){cell.classList.add('barrier-echo');cell.title='Cyan wall: Echo cannot enter; YOU can pass through.';}
      if(index===puzzle.playerGoal)cell.classList.add('player-goal');if(index===puzzle.echoGoal)cell.classList.add('echo-goal');if(index===state.player)cell.classList.add('has-player');if(index===state.echo)cell.classList.add('has-echo');
      if(index===puzzle.playerGoal&&state.player===puzzle.playerGoal&&!bothHome(puzzle,state))cell.classList.add('goal-waiting');if(index===puzzle.echoGoal&&state.echo===puzzle.echoGoal&&!bothHome(puzzle,state))cell.classList.add('goal-waiting');
      if(echoPreview.ready&&!solutionVisible&&index===echoPreview.target)cell.classList.add('echo-next-target',...(echoPreview.danger?['echo-next-danger']:[]));
      if(guide&&index===guide.playerTarget)cell.classList.add('practice-next-player');if(guide?.echoAction&&index===guide.echoTarget)cell.classList.add('practice-next-echo');
      cell.disabled=sharedBlocked.has(index)||playerPhase.has(index)||complete||failed;cell.innerHTML='';
      addHintGuide(cell,hintPlayerGuide,'player');addHintGuide(cell,hintEchoGuide,'echo');
      if(echoPreview.ready&&!solutionVisible&&index===echoPreview.target){const next=document.createElement('span');next.className='echo-next-marker';next.textContent=echoPreview.danger?'!':'NEXT';next.setAttribute('aria-hidden','true');cell.appendChild(next);}
      if(guide&&index===guide.playerTarget){const next=document.createElement('span');next.className='echo-practice-marker echo-practice-marker-you';next.textContent='NEXT';next.setAttribute('aria-hidden','true');cell.appendChild(next);}
      if(guide?.echoAction&&index===guide.echoTarget){const next=document.createElement('span');next.className='echo-practice-marker echo-practice-marker-echo';next.textContent='ECHO';next.setAttribute('aria-hidden','true');cell.appendChild(next);}
      if(index===puzzle.playerGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-player';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===puzzle.echoGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-ghost';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===state.player){const token=document.createElement('span');token.className='echo-agent echo-agent-player';token.textContent='YOU';cell.appendChild(token);}if(index===state.echo){const token=document.createElement('span');token.className='echo-agent echo-agent-ghost';token.textContent='E';token.setAttribute('aria-label','Echo');cell.appendChild(token);}
    });
    queue.innerHTML=renderQueue();const sequenceHtml=renderSequence();sequence.hidden=!sequenceHtml;sequence.innerHTML=sequenceHtml;renderBanner();onMetrics({moves,delay:puzzle.delay});
  }
  function fail(message){failed=true;failureMessage=friendlyFailure(message);practiceMessage='';clearHint();render();onStatus('');}
  function finish(){complete=true;practiceMessage='';clearHint();host.classList.add('game-solved-bloom');render();if(practice){onStatus('');onPracticeComplete('Guided practice complete. YOU and Echo reached P and E on the same turn.');}else{onStatus('');onComplete();}}
  function move(action){
    if(complete||failed||!DIRS[action])return false;
    if(solutionVisible){const expected=puzzle.solution[actions.length];if(action!==expected){practiceMessage=`Follow NEXT: ${DIRS[expected]?.arrow||''} ${DIRS[expected]?.label||''}.`;render();onStatus('');return false;}practiceMessage='';}
    const previousEcho=state.echo,next=advanceEchoState(puzzle,state,action);if(!next.ok){if(next.playerBlocked){if(solutionVisible){practiceMessage=next.reason;render();}else onStatus(next.reason);return false;}fail(next.reason);return false;}
    state=next.state;moves++;actions.push(action);clearHint();render();flashCell(state.player,'just-moved-you');if(state.echo!==previousEcho)flashCell(state.echo,'just-moved-echo');
    if(bothHome(puzzle,state)){finish();return true;}
    if(state.player===puzzle.playerGoal||state.echo===puzzle.echoGoal){onStatus('');return true;}
    onStatus('');return true;
  }
  function directionTo(index){if(index<0||index>=puzzle.size*puzzle.size)return'';const[pr,pc]=rcOf(state.player,puzzle.size),[tr,tc]=rcOf(index,puzzle.size);if(Math.abs(pr-tr)+Math.abs(pc-tc)!==1)return'';return tr<pr?'u':tr>pr?'d':tc<pc?'l':'r';}

  grid.addEventListener('click',event=>{const cell=event.target.closest('.echo-cell');if(cell)move(directionTo(Number(cell.dataset.index)));});
  banner.addEventListener('click',event=>{if(event.target.closest('[data-echo-reset]'))document.querySelector('#resetPuzzle')?.click();});
  const keyHandler=event=>{if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||''))return;const map={ArrowUp:'u',w:'u',W:'u',ArrowRight:'r',d:'r',D:'r',ArrowDown:'d',s:'d',S:'d',ArrowLeft:'l',a:'l',A:'l'},action=map[event.key];if(action){event.preventDefault();move(action);}};window.addEventListener('keydown',keyHandler);

  function resetState({keepPractice=false,keepSolution=false}={}){host.classList.remove('game-solved-bloom');state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};moves=0;actions=[];clearHint();solutionVisible=keepSolution;practice=keepPractice;complete=false;failed=false;failureMessage='';practiceMessage='';render();onStatus('');}
  resetState();

  return{
    supportsUndo:false,
    reset(){resetState();},
    hint(){
      if(complete||failed||solutionVisible)return false;
      const prefix=actions.every((action,index)=>puzzle.solution[index]===action);
      if(!prefix||actions.length>=puzzle.solution.length){onStatus('You left the guided route. Reset Puzzle if you want another hint.');return false;}
      if(hintAtMove===actions.length&&hintActions.length){onStatus('This hint is already on the board. Make a move first.');return false;}
      hintActions=puzzle.solution.slice(actions.length,actions.length+HINT_LOOKAHEAD);hintForecast=forecastEchoStep(puzzle,state,hintActions);hintAtMove=actions.length;
      if(!hintForecast.ok){clearHint();onStatus('Hint unavailable from this position. Reset Puzzle and try again.');return false;}
      render();const echoMoves=hintForecast.echoSteps.map(step=>step.action).filter(Boolean),echoMessage=echoMoves.length?` Echo replays ${arrows(echoMoves)}.`:'';onStatus(`Hint: ${arrows(hintActions)}.${echoMessage}`);return true;
    },
    solution(){if(complete)return;resetState({keepPractice:true,keepSolution:true});},
    hideSolution(){if(complete)return;solutionVisible=false;practiceMessage='';render();onStatus('');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190}),metadata:{moves,size:puzzle.size,delay:puzzle.delay,solution_moves:puzzle.solutionMoves,actions:[...actions]}};},
    destroy(){window.removeEventListener('keydown',keyHandler);for(const timer of feedbackTimers)clearTimeout(timer);feedbackTimers.clear();host.classList.remove('game-solved-bloom');}
  };
}