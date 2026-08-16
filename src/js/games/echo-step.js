import {rngFromSeed,shuffle,scoreFromPerformance,scoreTimeDivisor,orthogonalNeighbors,rcOf,indexOf} from './utils.js';

const DIRS={u:{dr:-1,dc:0,label:'Up',arrow:'↑'},r:{dr:0,dc:1,label:'Right',arrow:'→'},d:{dr:1,dc:0,label:'Down',arrow:'↓'},l:{dr:0,dc:-1,label:'Left',arrow:'←'}};
const DIR_KEYS=['u','r','d','l'];
const LEVEL={
  easy:{size:6,delay:2,minMoves:8,maxMoves:11,blocked:5,minTurns:3,candidates:18},
  medium:{size:8,delay:3,minMoves:14,maxMoves:19,blocked:14,minTurns:6,candidates:28},
  hard:{size:10,delay:4,minMoves:22,maxMoves:30,blocked:28,minTurns:10,candidates:42}
};

function inBounds(row,col,size){return row>=0&&col>=0&&row<size&&col<size;}
function translated(index,size,dr,dc){const[row,col]=rcOf(index,size),r=row+dr,c=col+dc;return inBounds(r,c,size)?indexOf(r,c,size):-1;}
function actionBetween(a,b,size){const[ar,ac]=rcOf(a,size),[br,bc]=rcOf(b,size);if(br<ar)return'u';if(br>ar)return'd';if(bc<ac)return'l';return'r';}
function targetFor(index,size,action){const dir=DIRS[action];if(!dir)return-1;const[row,col]=rcOf(index,size),r=row+dir.dr,c=col+dir.dc;return inBounds(r,c,size)?indexOf(r,c,size):-1;}
function countTurns(actions){let turns=0;for(let i=1;i<actions.length;i++)if(actions[i]!==actions[i-1])turns++;return turns;}

function stateKey(state){return`${state.player}:${state.echo}:${state.pending.join('')}`;}
function moveEcho(puzzle,state,action){const target=targetFor(state.echo,puzzle.size,action);if(target<0||puzzle.blocked.includes(target)||target===state.player)return{ok:false,reason:'Echo hit an obstacle.'};return{ok:true,state:{...state,echo:target}};}
export function advanceEchoState(puzzle,state,action){
  const playerTarget=targetFor(state.player,puzzle.size,action);
  if(playerTarget<0||puzzle.blocked.includes(playerTarget))return{ok:false,reason:'That move is blocked.',playerBlocked:true};
  if(playerTarget===state.echo)return{ok:false,reason:'Echo is occupying that cell.',playerBlocked:true};
  let next={player:playerTarget,echo:state.echo,pending:[...state.pending,action]};
  if(next.pending.length>puzzle.delay){const echoAction=next.pending.shift(),moved=moveEcho(puzzle,next,echoAction);if(!moved.ok)return moved;next=moved.state;}
  return{ok:true,state:next};
}
export function settleEchoState(puzzle,state){
  let next={player:state.player,echo:state.echo,pending:[...state.pending]};
  while(next.pending.length){const action=next.pending.shift(),moved=moveEcho(puzzle,next,action);if(!moved.ok)return moved;next=moved.state;}
  return{ok:next.player===puzzle.playerGoal&&next.echo===puzzle.echoGoal,state:next,reason:next.echo===puzzle.echoGoal?'':'Echo finished on the wrong cell.'};
}
export function simulateEchoStep(puzzle,actions){
  let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};
  for(let i=0;i<actions.length;i++){
    const next=advanceEchoState(puzzle,state,actions[i]);if(!next.ok)return{solved:false,reason:next.reason,state,terminalAt:i};state=next.state;
    if(state.player===puzzle.playerGoal){const settled=settleEchoState(puzzle,state);return{solved:Boolean(settled.ok)&&i===actions.length-1,reason:settled.reason,state:settled.state||state,terminalAt:i+1};}
  }
  return{solved:false,reason:'Player has not reached the goal.',state,terminalAt:actions.length};
}

function routeCandidate(size,targetMoves,delta,rng,minTurns){
  const safe=[];for(let i=0;i<size*size;i++)if(translated(i,size,delta[0],delta[1])>=0)safe.push(i);
  const safeSet=new Set(safe),starts=shuffle(safe,rng);let best=null,nodes=0;
  for(const start of starts.slice(0,Math.min(starts.length,22))){
    const path=[start],used=new Set(path),actions=[];
    function dfs(current){
      if(path.length===targetMoves+1){
        const direct=(()=>{const[a,b]=rcOf(path[0],size),[c,d]=rcOf(path.at(-1),size);return Math.abs(a-c)+Math.abs(b-d);})();
        if(countTurns(actions)<minTurns||direct<Math.max(3,Math.floor(targetMoves*.18)))return false;
        const echoStart=translated(path[0],size,delta[0],delta[1]),echoGoal=translated(path.at(-1),size,delta[0],delta[1]);
        const shell={size,delay:1,blocked:[],playerStart:path[0],echoStart,playerGoal:path.at(-1),echoGoal};
        const check=simulateEchoStep(shell,actions);if(!check.solved)return false;
        best={path:[...path],actions:[...actions],delta:[...delta]};return true;
      }
      if(++nodes>90000)return false;
      const last=actions.at(-1)||'',choices=shuffle(orthogonalNeighbors(current,size,size).filter(n=>safeSet.has(n)&&!used.has(n)),rng)
        .map(next=>({next,action:actionBetween(current,next,size)}))
        .sort((a,b)=>((b.action!==last?1:0)-(a.action!==last?1:0))||rng()-.5);
      for(const choice of choices){used.add(choice.next);path.push(choice.next);actions.push(choice.action);if(dfs(choice.next))return true;actions.pop();path.pop();used.delete(choice.next);}
      return false;
    }
    if(dfs(start))break;
  }
  return best;
}

function fallbackRoute(size,targetMoves){
  const split=Math.floor(size/2),path=[];for(let r=0;r<split;r++){if(r%2===0){for(let c=0;c<size;c++)path.push(indexOf(r,c,size));}else{for(let c=size-1;c>=0;c--)path.push(indexOf(r,c,size));}}
  const picked=path.slice(0,Math.min(path.length,targetMoves+1)),actions=[];for(let i=1;i<picked.length;i++)actions.push(actionBetween(picked[i-1],picked[i],size));return{path:picked,actions,delta:[split,0]};
}

function blockerScore(index,routeSet,echoSet,size){let score=0;for(const neighbor of orthogonalNeighbors(index,size,size)){if(routeSet.has(neighbor))score+=3;if(echoSet.has(neighbor))score+=3;}return score;}
export function generateEchoStep(difficulty='easy',seed='echo-step'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,rng=rngFromSeed(`${seed}:echo-step:v1`),deltaPool=difficulty==='easy'?[[0,2],[2,0],[0,-2],[-2,0]]:difficulty==='medium'?[[0,2],[2,0],[1,2],[2,1],[-1,2],[2,-1]]:[[0,3],[3,0],[2,2],[-2,2],[2,-2],[1,3],[3,1]],target=cfg.minMoves+Math.floor(rng()*(cfg.maxMoves-cfg.minMoves+1));
  let route=null;
  for(const delta of shuffle(deltaPool,rng)){route=routeCandidate(cfg.size,target,delta,rng,cfg.minTurns);if(route)break;}
  if(!route)route=fallbackRoute(cfg.size,target);
  const playerStart=route.path[0],playerGoal=route.path.at(-1),echoStart=translated(playerStart,cfg.size,route.delta[0],route.delta[1]),echoGoal=translated(playerGoal,cfg.size,route.delta[0],route.delta[1]),playerRoute=new Set(route.path),echoRoute=new Set(route.path.map(index=>translated(index,cfg.size,route.delta[0],route.delta[1]))),reserved=new Set([...playerRoute,...echoRoute]),candidates=[];
  for(let i=0;i<cfg.size*cfg.size;i++)if(!reserved.has(i))candidates.push({index:i,score:blockerScore(i,playerRoute,echoRoute,cfg.size)+rng()*1.8});
  candidates.sort((a,b)=>b.score-a.score);const blocked=candidates.slice(0,Math.min(cfg.blocked,candidates.length)).map(item=>item.index).sort((a,b)=>a-b);
  const puzzle={size:cfg.size,delay:cfg.delay,blocked,playerStart,echoStart,playerGoal,echoGoal,solution:[...route.actions],solutionMoves:route.actions.length,difficulty,seed,offset:{dr:route.delta[0],dc:route.delta[1]},turns:countTurns(route.actions)};
  const check=simulateEchoStep(puzzle,puzzle.solution);if(!check.solved)throw new Error('Echo Step generator produced an invalid solution.');return puzzle;
}

function sequenceLabel(actions,max=18){const shown=actions.slice(0,max).map(action=>DIRS[action].arrow).join(' ');return`${shown}${actions.length>max?' …':''}`;}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateEchoStep(difficulty,seed),timeDivisor=scoreTimeDivisor('echo-step',difficulty),blocked=new Set(puzzle.blocked);
  let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]},moves=0,actions=[],hintUses=0,hinted='',solutionVisible=false,practice=false,complete=false,failed=false,settling=false,settleTimer=null;

  host.innerHTML=`<div class="echo-stage"><div class="echo-legend"><span><i class="echo-dot echo-dot-player"></i>You</span><span><i class="echo-dot echo-dot-ghost"></i>Echo · ${puzzle.delay} steps behind</span></div><div class="echo-grid" style="--grid-size:${puzzle.size}" role="grid" aria-label="Echo Step board"></div><div class="echo-timeline"><span>Pending echo</span><div class="echo-queue" aria-live="polite"></div></div><div class="echo-controls" aria-label="Movement controls"><span></span><button type="button" data-echo-move="u" aria-label="Move up">↑</button><span></span><button type="button" data-echo-move="l" aria-label="Move left">←</button><button type="button" data-echo-move="d" aria-label="Move down">↓</button><button type="button" data-echo-move="r" aria-label="Move right">→</button></div><div class="echo-sequence" hidden></div></div>`;
  const grid=host.querySelector('.echo-grid'),queue=host.querySelector('.echo-queue'),sequence=host.querySelector('.echo-sequence');
  for(let i=0;i<puzzle.size*puzzle.size;i++){const cell=document.createElement('button');cell.type='button';cell.className='echo-cell';cell.dataset.index=String(i);cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`Row ${Math.floor(i/puzzle.size)+1}, column ${i%puzzle.size+1}`);grid.appendChild(cell);}

  const pathFrom=(start,solution)=>{const out=[start];let pos=start;for(const action of solution){pos=targetFor(pos,puzzle.size,action);out.push(pos);}return out;};
  const solutionPlayer=new Set(pathFrom(puzzle.playerStart,puzzle.solution)),solutionEcho=new Set(pathFrom(puzzle.echoStart,puzzle.solution));

  function metrics(){onMetrics({moves,delay:puzzle.delay,score:0});}
  function render(){
    grid.querySelectorAll('.echo-cell').forEach(cell=>{const index=Number(cell.dataset.index);cell.className='echo-cell';if(blocked.has(index))cell.classList.add('blocked');if(index===puzzle.playerGoal)cell.classList.add('player-goal');if(index===puzzle.echoGoal)cell.classList.add('echo-goal');if(solutionVisible&&solutionPlayer.has(index))cell.classList.add('solution-player');if(solutionVisible&&solutionEcho.has(index))cell.classList.add('solution-echo');if(index===state.player)cell.classList.add('has-player');if(index===state.echo)cell.classList.add('has-echo');if(hinted&&targetFor(state.player,puzzle.size,hinted)===index)cell.classList.add('hinted');cell.disabled=blocked.has(index)||complete||failed||settling;cell.innerHTML='';if(index===puzzle.playerGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-player';cell.appendChild(goal);}if(index===puzzle.echoGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-ghost';cell.appendChild(goal);}if(index===state.player){const token=document.createElement('span');token.className='echo-agent echo-agent-player';token.textContent='●';cell.appendChild(token);}if(index===state.echo){const token=document.createElement('span');token.className='echo-agent echo-agent-ghost';token.textContent='◉';cell.appendChild(token);}});
    queue.innerHTML=state.pending.length?state.pending.map(action=>`<b>${DIRS[action].arrow}</b>`).join(''):`<small>Waiting · ${puzzle.delay} step delay</small>`;
    sequence.hidden=!solutionVisible;sequence.textContent=solutionVisible?`Practice route · ${sequenceLabel(puzzle.solution)}`:'';
    host.querySelectorAll('[data-echo-move]').forEach(button=>button.disabled=complete||failed||settling);
    metrics();
  }

  function fail(message){failed=true;settling=false;hinted='';render();onStatus(`${message} Timeline broke — Reset Puzzle to try again.`);}
  function finish(){complete=true;settling=false;hinted='';host.classList.add('game-solved-bloom');render();if(practice){onStatus('');onPracticeComplete('Echo Step practice complete. Reset to try this board again, or start a New Puzzle.');}else{onStatus('Both reached home with no moves left behind.');onComplete();}}

  function settleAnimated(){
    settling=true;onStatus('You are home. Echo is catching up…');render();
    const tick=()=>{
      if(!state.pending.length){if(state.echo===puzzle.echoGoal)finish();else fail('Echo finished on the wrong goal.');return;}
      const action=state.pending.shift(),moved=moveEcho(puzzle,state,action);if(!moved.ok){fail(moved.reason);return;}state=moved.state;render();settleTimer=setTimeout(tick,150);
    };
    settleTimer=setTimeout(tick,150);
  }

  function move(action){
    if(complete||failed||settling||!DIRS[action])return false;
    const next=advanceEchoState(puzzle,state,action);if(!next.ok){if(next.playerBlocked){onStatus(next.reason);return false;}fail(next.reason);return false;}
    state=next.state;moves++;actions.push(action);hinted='';render();
    if(state.player===puzzle.playerGoal){settleAnimated();return true;}
    onStatus(state.pending.length<puzzle.delay?`Echo starts after ${puzzle.delay-state.pending.length} more move${puzzle.delay-state.pending.length===1?'':'s'}.`:'Echo is replaying your past moves.');return true;
  }

  function directionTo(index){if(index<0||index>=puzzle.size*puzzle.size)return'';const[pr,pc]=rcOf(state.player,puzzle.size),[tr,tc]=rcOf(index,puzzle.size);if(Math.abs(pr-tr)+Math.abs(pc-tc)!==1)return'';return tr<pr?'u':tr>pr?'d':tc<pc?'l':'r';}
  grid.addEventListener('click',event=>{const cell=event.target.closest('.echo-cell');if(cell)move(directionTo(Number(cell.dataset.index)));});
  host.querySelector('.echo-controls').addEventListener('click',event=>{const button=event.target.closest('[data-echo-move]');if(button)move(button.dataset.echoMove);});
  const keyHandler=event=>{if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||''))return;const map={ArrowUp:'u',w:'u',W:'u',ArrowRight:'r',d:'r',D:'r',ArrowDown:'d',s:'d',S:'d',ArrowLeft:'l',a:'l',A:'l'};const action=map[event.key];if(action){event.preventDefault();move(action);}};window.addEventListener('keydown',keyHandler);

  function resetState(){if(settleTimer)clearTimeout(settleTimer);host.classList.remove('game-solved-bloom');state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};moves=0;actions=[];hintUses=0;hinted='';solutionVisible=false;practice=false;complete=false;failed=false;settling=false;render();onStatus(`Move with Arrow/WASD or the buttons. Echo repeats each move ${puzzle.delay} steps later.`);}

  resetState();
  return{
    supportsUndo:false,
    reset(){resetState();},
    hint(){if(complete||failed||settling||solutionVisible)return false;const prefix=actions.every((action,index)=>puzzle.solution[index]===action);if(!prefix||actions.length>=puzzle.solution.length){onStatus('This route has left the guided path. Reset Puzzle if you want a route hint.');return false;}hintUses++;hinted=puzzle.solution[actions.length];render();onStatus(`Try ${DIRS[hinted].label.toLowerCase()} next. Remember: Echo will copy it ${puzzle.delay} steps later.`);return true;},
    solution(){if(complete)return;practice=true;solutionVisible=true;if(settleTimer)clearTimeout(settleTimer);state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};moves=0;actions=[];failed=false;settling=false;hinted='';render();onStatus(`Practice route shown from the start: ${sequenceLabel(puzzle.solution,12)}`);},
    hideSolution(){if(complete)return;solutionVisible=false;render();onStatus('');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.solutionMoves)*70,hintPenalty:hints*190}),metadata:{moves,size:puzzle.size,delay:puzzle.delay,solution_moves:puzzle.solutionMoves,actions:[...actions]}};},
    destroy(){if(settleTimer)clearTimeout(settleTimer);window.removeEventListener('keydown',keyHandler);host.classList.remove('game-solved-bloom');}
  };
}
