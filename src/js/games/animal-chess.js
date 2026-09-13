export const ANIMAL_CHESS_ROWS=9;
export const ANIMAL_CHESS_COLS=7;

export const ANIMAL_CHESS_PIECES={
  rat:{name:'Rat',rank:1,icon:'🐀',han:'鼠'},
  cat:{name:'Cat',rank:2,icon:'🐈',han:'猫'},
  dog:{name:'Dog',rank:3,icon:'🐕',han:'狗'},
  wolf:{name:'Wolf',rank:4,icon:'🐺',han:'狼'},
  leopard:{name:'Leopard',rank:5,icon:'🐆',han:'豹'},
  tiger:{name:'Tiger',rank:6,icon:'🐯',han:'虎'},
  lion:{name:'Lion',rank:7,icon:'🦁',han:'狮'},
  elephant:{name:'Elephant',rank:8,icon:'🐘',han:'象'}
};

const RIVERS=new Set(['3,1','3,2','4,1','4,2','5,1','5,2','3,4','3,5','4,4','4,5','5,4','5,5']);
const DENS={blue:'0,3',red:'8,3'};
const TRAPS={blue:new Set(['0,2','0,4','1,3']),red:new Set(['8,2','8,4','7,3'])};
const DIRS=[[-1,0],[1,0],[0,-1],[0,1]];
const START_TYPES=Object.keys(ANIMAL_CHESS_PIECES);
const SETTINGS_KEY='snapoki:animal-chess:v3';
const FILES=['A','B','C','D','E','F','G'];

const key=(r,c)=>`${r},${c}`;
const inBounds=(r,c)=>r>=0&&r<ANIMAL_CHESS_ROWS&&c>=0&&c<ANIMAL_CHESS_COLS;
const opponent=side=>side==='red'?'blue':'red';
const sideLabel=side=>side==='red'?'Red':'Blue';
const coordinate=(r,c)=>`${FILES[c]}${ANIMAL_CHESS_ROWS-r}`;
export const isAnimalChessRiver=(r,c)=>RIVERS.has(key(r,c));
export const animalChessDenOwner=(r,c)=>Object.entries(DENS).find(([,pos])=>pos===key(r,c))?.[0]||null;
export const animalChessTrapOwner=(r,c)=>Object.entries(TRAPS).find(([,set])=>set.has(key(r,c)))?.[0]||null;

function piece(side,type,r,c){const info=ANIMAL_CHESS_PIECES[type];return{id:`${side}-${type}`,side,type,rank:info.rank,r,c};}

export function createAnimalChessState(){
  const pieces=[
    piece('blue','lion',0,0),piece('blue','tiger',0,6),piece('blue','dog',1,1),piece('blue','cat',1,5),
    piece('blue','rat',2,0),piece('blue','leopard',2,2),piece('blue','wolf',2,4),piece('blue','elephant',2,6),
    piece('red','elephant',6,0),piece('red','wolf',6,2),piece('red','leopard',6,4),piece('red','rat',6,6),
    piece('red','cat',7,1),piece('red','dog',7,5),piece('red','tiger',8,0),piece('red','lion',8,6)
  ];
  return{turn:'red',pieces,moves:0,winner:null,draw:false,noCaptureMoves:0,lastMove:null};
}

export function generateAnimalChess(difficulty='local',seed='animal-chess:local'){
  const state=createAnimalChessState();
  return{...state,difficulty,seed,pieces:state.pieces.map(p=>({...p}))};
}

export function animalChessPieceAt(state,r,c){return state.pieces.find(p=>p.r===r&&p.c===c)||null;}
function cloneState(state){return{...state,pieces:state.pieces.map(p=>({...p})),lastMove:state.lastMove?{...state.lastMove}:null};}
function ownDen(side,r,c){return DENS[side]===key(r,c);}
function trappedFor(pieceValue,r,c){const trapOwner=animalChessTrapOwner(r,c);return Boolean(trapOwner&&trapOwner!==pieceValue.side);}
function effectiveRank(pieceValue,r,c){return trappedFor(pieceValue,r,c)?0:pieceValue.rank;}

function canCapture(state,attacker,defender,fromR,fromC,toR,toC){
  if(!defender||attacker.side===defender.side)return false;
  const fromWater=isAnimalChessRiver(fromR,fromC),toWater=isAnimalChessRiver(toR,toC);
  if((fromWater||toWater)&&attacker.type==='rat'&&fromWater!==toWater)return false;
  const defenderRank=effectiveRank(defender,toR,toC),attackerRank=effectiveRank(attacker,fromR,fromC);
  if(defenderRank===0)return true;
  if(attackerRank===0)return false;
  if(attacker.type==='rat'&&defender.type==='elephant')return !fromWater&&!toWater;
  if(attacker.type==='elephant'&&defender.type==='rat')return false;
  return attackerRank>=defenderRank;
}

function riverJump(state,pieceValue,dr,dc){
  if(!['lion','tiger'].includes(pieceValue.type))return null;
  let r=pieceValue.r+dr,c=pieceValue.c+dc;
  if(!inBounds(r,c)||!isAnimalChessRiver(r,c))return null;
  while(inBounds(r,c)&&isAnimalChessRiver(r,c)){
    const blocker=animalChessPieceAt(state,r,c);
    if(blocker?.type==='rat')return null;
    r+=dr;c+=dc;
  }
  return inBounds(r,c)?{r,c,jump:true}:null;
}

function candidateForDirection(state,pieceValue,dr,dc){
  let r=pieceValue.r+dr,c=pieceValue.c+dc,jump=false;
  if(!inBounds(r,c))return null;
  if(isAnimalChessRiver(r,c)&&pieceValue.type!=='rat'){
    const jumped=riverJump(state,pieceValue,dr,dc);
    if(!jumped)return null;
    ({r,c}=jumped);jump=true;
  }
  if(ownDen(pieceValue.side,r,c))return null;
  const target=animalChessPieceAt(state,r,c);
  if(target?.side===pieceValue.side)return null;
  if(target&&!canCapture(state,pieceValue,target,pieceValue.r,pieceValue.c,r,c))return null;
  return{r,c,jump,capture:target?.id||null,den:animalChessDenOwner(r,c)};
}

export function animalChessLegalMoves(state,pieceId){
  if(state.winner||state.draw)return[];
  const p=state.pieces.find(item=>item.id===pieceId);
  if(!p)return[];
  return DIRS.map(([dr,dc])=>candidateForDirection(state,p,dr,dc)).filter(Boolean);
}

export function animalChessHasLegalMove(state,side){
  return state.pieces.some(p=>p.side===side&&animalChessLegalMoves({...state,turn:side},p.id).length>0);
}

export function animalChessAllLegalMoves(state,side=state.turn){
  if(state.winner||state.draw)return[];
  const view={...state,turn:side};
  return state.pieces.filter(p=>p.side===side).flatMap(p=>animalChessLegalMoves(view,p.id).map(move=>({pieceId:p.id,...move})));
}

export function applyAnimalChessMove(state,pieceId,toR,toC){
  if(state.winner||state.draw)return state;
  const p=state.pieces.find(item=>item.id===pieceId);
  if(!p||p.side!==state.turn)return state;
  const move=animalChessLegalMoves(state,pieceId).find(item=>item.r===toR&&item.c===toC);
  if(!move)return state;
  const next=cloneState(state),moving=next.pieces.find(item=>item.id===pieceId),from={r:moving.r,c:moving.c};
  const captured=next.pieces.find(item=>item.r===toR&&item.c===toC&&item.side!==moving.side)||null;
  if(captured)next.pieces=next.pieces.filter(item=>item.id!==captured.id);
  moving.r=toR;moving.c=toC;next.moves++;next.noCaptureMoves=captured?0:next.noCaptureMoves+1;
  next.lastMove={pieceId,fromR:from.r,fromC:from.c,toR,toC,capturedId:captured?.id||null};
  const enemy=opponent(moving.side);
  if(DENS[enemy]===key(toR,toC)||!next.pieces.some(item=>item.side===enemy))next.winner=moving.side;
  else{
    next.turn=enemy;
    if(!animalChessHasLegalMove(next,enemy))next.winner=moving.side;
    else if(next.noCaptureMoves>=120)next.draw=true;
  }
  return next;
}

function materialScore(state,side){return state.pieces.reduce((score,p)=>score+(p.side===side?1:-1)*(p.rank*11+8),0);}
function denPressure(state,side){const enemy=opponent(side),[denR,denC]=DENS[enemy].split(',').map(Number);return state.pieces.filter(p=>p.side===side).reduce((score,p)=>score+(14-(Math.abs(p.r-denR)+Math.abs(p.c-denC)))*1.35,0);}
function ownDenSafety(state,side){const [denR,denC]=DENS[side].split(',').map(Number),enemy=opponent(side);return state.pieces.filter(p=>p.side===enemy).reduce((score,p)=>score-Math.max(0,7-(Math.abs(p.r-denR)+Math.abs(p.c-denC)))*2.1,0);}
function mobilityScore(state,side){const mine=animalChessAllLegalMoves({...state,turn:side},side).length,theirs=animalChessAllLegalMoves({...state,turn:opponent(side)},opponent(side)).length;return(mine-theirs)*.75;}
function trapScore(state,side){return state.pieces.reduce((score,p)=>{const owner=animalChessTrapOwner(p.r,p.c);if(!owner||owner===p.side)return score;return score+(p.side===side?-22:22);},0);}

export function animalChessEvaluatePosition(state,side){
  if(state.winner===side)return 100000-state.moves;
  if(state.winner===opponent(side))return -100000+state.moves;
  if(state.draw)return 0;
  return materialScore(state,side)+denPressure(state,side)+ownDenSafety(state,side)+mobilityScore(state,side)+trapScore(state,side);
}

function actionTie(action){let hash=2166136261;const text=`${action.pieceId}:${action.r}:${action.c}`;for(const ch of text){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function immediateActionScore(state,action,side){
  const moving=state.pieces.find(p=>p.id===action.pieceId),captured=action.capture?state.pieces.find(p=>p.id===action.capture):null;let score=0;
  if(action.den===opponent(side))score+=90000;
  if(captured)score+=36+captured.rank*14+(captured.type==='elephant'?18:0);
  if(action.jump)score+=5;
  const trapOwner=animalChessTrapOwner(action.r,action.c);if(trapOwner===opponent(side))score-=26+moving.rank*2;
  const [denR,denC]=DENS[opponent(side)].split(',').map(Number),before=Math.abs(moving.r-denR)+Math.abs(moving.c-denC),after=Math.abs(action.r-denR)+Math.abs(action.c-denC);score+=(before-after)*3;
  return score;
}
function orderedActions(state,side){return animalChessAllLegalMoves(state,side).map(action=>({...action,order:immediateActionScore(state,action,side),tie:actionTie(action)})).sort((a,b)=>b.order-a.order||a.tie-b.tie);}
function minimax(state,perspective,depth,alpha,beta){
  if(depth<=0||state.winner||state.draw)return animalChessEvaluatePosition(state,perspective);
  const side=state.turn,actions=orderedActions(state,side);if(!actions.length)return animalChessEvaluatePosition(state,perspective);
  const maximize=side===perspective;let best=maximize?-Infinity:Infinity;
  for(const action of actions){
    const next=applyAnimalChessMove(state,action.pieceId,action.r,action.c),score=minimax(next,perspective,depth-1,alpha,beta);
    if(maximize){best=Math.max(best,score);alpha=Math.max(alpha,best);}else{best=Math.min(best,score);beta=Math.min(beta,best);}
    if(beta<=alpha)break;
  }
  return best;
}

export function chooseAnimalChessAiMove(state,difficulty='medium',side=state.turn){
  if(state.winner||state.draw||state.turn!==side)return null;
  const actions=orderedActions(state,side);if(!actions.length)return null;
  const ranked=actions.map(action=>{
    const after=applyAnimalChessMove({...state,turn:side},action.pieceId,action.r,action.c);
    let score=immediateActionScore(state,action,side)+animalChessEvaluatePosition(after,side)*.35;
    if(difficulty==='hard'&&!after.winner&&!after.draw)score+=minimax(after,side,2,-Infinity,Infinity)*.82;
    return{pieceId:action.pieceId,r:action.r,c:action.c,jump:action.jump,capture:action.capture,den:action.den,score,tie:action.tie};
  }).sort((a,b)=>b.score-a.score||a.tie-b.tie);
  if(difficulty==='easy'){const pool=Math.min(3,ranked.length);return ranked[(state.moves+side.length)%pool];}
  return ranked[0];
}

function readSettings(){
  if(typeof localStorage==='undefined')return{mode:'local',aiLevel:'medium',soundOn:true};
  try{const value=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');return{mode:value.mode==='cpu'?'cpu':'local',aiLevel:['easy','medium','hard'].includes(value.aiLevel)?value.aiLevel:'medium',soundOn:value.soundOn!==false};}
  catch{return{mode:'local',aiLevel:'medium',soundOn:true};}
}
function writeSettings(settings){if(typeof localStorage==='undefined')return;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}

export function createGame({host,onMetrics=()=>{},onStatus=()=>{}}){
  if(typeof document!=='undefined'&&!document.querySelector('link[data-animal-chess-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/styles/animal-chess.css';link.dataset.animalChessStyle='true';document.head.appendChild(link);}
  const saved=readSettings();
  let state=createAnimalChessState(),selectedId=null,history=[],moveLog=[],mode=saved.mode,aiLevel=saved.aiLevel,aiTimer=0,busy=false,lastMoveAt=0,soundOn=saved.soundOn,audioContext=null,destroyed=false,focusCell={r:8,c:0},restoreBoardFocus=false;

  host.innerHTML=`<div class="animal-chess-app"><div class="animal-chess-command"><div class="animal-chess-titleblock"><span class="animal-chess-kicker">DOU SHOU QI · 斗兽棋</span><strong>Animal Chess</strong><small>Classic jungle strategy · premium board</small></div><div class="animal-chess-toolbar"><div class="animal-chess-segment" role="group" aria-label="Game mode"><button type="button" data-mode="local">2 Players</button><button type="button" data-mode="cpu">vs CPU</button></div><div class="animal-chess-cpu-level" id="animalChessCpuLevel" aria-label="Computer difficulty"><button type="button" data-ai="easy">Easy</button><button type="button" data-ai="medium">Smart</button><button type="button" data-ai="hard">Expert</button></div><button id="animalChessSound" class="animal-chess-iconbtn" type="button" title="Sound"></button><button id="animalChessUndo" class="animal-chess-iconbtn" type="button" disabled aria-label="Undo last turn" title="Undo">↶</button><button id="animalChessRestart" class="animal-chess-new" type="button">New Game</button></div></div><div class="animal-chess-matchbar" id="animalChessMatchbar"></div><div class="animal-chess-tactical" id="animalChessTactical" aria-live="polite"></div><div class="animal-chess-arena"><aside class="animal-chess-player blue" id="animalChessBluePlayer"></aside><main class="animal-chess-center"><div class="animal-chess-boardframe"><div class="animal-chess-board" id="animalChessBoard" role="grid" aria-label="Animal Chess board. Use arrow keys to move focus and Enter to select or move."></div><div class="animal-chess-result" id="animalChessResult" hidden></div></div><div class="animal-chess-rulebar"><span><b>鼠</b> Rat beats Elephant</span><span><b>狮 / 虎</b> leap rivers</span><span><b>✦</b> enemy trap = rank 0</span><span><b>◆</b> enemy den = win</span></div></main><aside class="animal-chess-player red" id="animalChessRedPlayer"></aside></div><div class="animal-chess-history"><span>MOVE HISTORY</span><div id="animalChessHistory"><i>No moves yet</i></div></div></div>`;

  const board=host.querySelector('#animalChessBoard'),matchbar=host.querySelector('#animalChessMatchbar'),tactical=host.querySelector('#animalChessTactical'),undo=host.querySelector('#animalChessUndo'),restart=host.querySelector('#animalChessRestart'),sound=host.querySelector('#animalChessSound'),cpuLevelHost=host.querySelector('#animalChessCpuLevel'),bluePlayer=host.querySelector('#animalChessBluePlayer'),redPlayer=host.querySelector('#animalChessRedPlayer'),historyHost=host.querySelector('#animalChessHistory'),resultHost=host.querySelector('#animalChessResult');
  const sideCount=side=>state.pieces.filter(p=>p.side===side).length,legalTargets=()=>selectedId?animalChessLegalMoves(state,selectedId):[],savePreferences=()=>writeSettings({mode,aiLevel,soundOn});

  function syncToolbar(){
    host.querySelectorAll('[data-mode]').forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    cpuLevelHost.hidden=mode!=='cpu';
    host.querySelectorAll('[data-ai]').forEach(button=>{const active=button.dataset.ai===aiLevel;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    sound.textContent=soundOn?'🔊':'🔇';sound.setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');sound.setAttribute('aria-pressed',String(!soundOn));
  }

  function tone(freq,start,duration,type='sine',volume=.022){if(!audioContext)return;const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);osc.type=type;osc.frequency.setValueAtTime(freq,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.start(start);osc.stop(start+duration+.02);}
  function playSound(kind){
    if(!soundOn||typeof window==='undefined')return;const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
    try{audioContext ||= new AudioCtx();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime;
      if(kind==='select'){tone(440,now,.045,'sine',.018);tone(660,now+.012,.04,'sine',.009);}
      else if(kind==='move'){tone(235,now,.07,'triangle',.022);tone(176,now+.025,.075,'sine',.012);}
      else if(kind==='capture'){tone(155,now,.11,'triangle',.034);tone(232,now+.018,.09,'sine',.018);tone(116,now+.045,.12,'sine',.012);}
      else if(kind==='undo'){tone(330,now,.06,'triangle',.018);tone(247,now+.04,.07,'sine',.012);}
      else if(kind==='win'){tone(392,now,.18,'sine',.022);tone(523,now+.11,.2,'sine',.026);tone(659,now+.23,.28,'sine',.03);}
    }catch{}
  }

  function winnerReason(){if(!state.winner)return'';const enemy=opponent(state.winner),last=state.lastMove;if(last&&DENS[enemy]===key(last.toR,last.toC))return'Enemy den captured';if(!state.pieces.some(p=>p.side===enemy))return'All rival animals captured';return'No legal moves remain';}
  function capturedTypes(side){const alive=new Set(state.pieces.filter(p=>p.side===side).map(p=>p.type));return START_TYPES.filter(type=>!alive.has(type));}
  function miniToken(type){const info=ANIMAL_CHESS_PIECES[type];return`<span class="animal-chess-mini" title="${info.name}, rank ${info.rank}" aria-label="${info.name}, rank ${info.rank}"><b>${info.han}</b><small>${info.rank}</small></span>`;}
  function renderPlayer(side,el){const role=mode==='cpu'&&side==='blue'?`Computer · ${aiLevel==='hard'?'Expert':aiLevel==='easy'?'Easy':'Smart'}`:side==='red'?'Player 1':'Player 2',captured=capturedTypes(side),active=!state.winner&&!state.draw&&state.turn===side;el.className=`animal-chess-player ${side}${active?' active':''}`;el.innerHTML=`<div class="animal-chess-playerhead"><span class="animal-chess-side-dot"></span><div><strong>${sideLabel(side)}</strong><small>${role}</small></div>${active?'<em>TURN</em>':''}</div><div class="animal-chess-piececount"><b>${sideCount(side)}</b><span>animals<br>left</span></div><div class="animal-chess-captured"><span>Lost</span><div>${captured.length?captured.map(miniToken).join(''):'<i>—</i>'}</div></div>`;}
  function announce(){onMetrics({turn:state.draw?'Draw':state.winner?`${sideLabel(state.winner)} wins`:sideLabel(state.turn),red:sideCount('red'),blue:sideCount('blue'),moves:state.moves});if(state.winner)onStatus(`${sideLabel(state.winner)} wins Animal Chess. ${winnerReason()}.`);else if(state.draw)onStatus('Draw after 120 moves without a capture.');else if(busy)onStatus('Blue computer is thinking.');else onStatus(`${sideLabel(state.turn)} to move.`);}
  function cellLabel(r,c,p){const den=animalChessDenOwner(r,c),trap=animalChessTrapOwner(r,c),special=den?`${sideLabel(den)} den`:trap?`${sideLabel(trap)} trap`:isAnimalChessRiver(r,c)?'river':'land',coord=coordinate(r,c);return p?`${coord}. ${sideLabel(p.side)} ${ANIMAL_CHESS_PIECES[p.type].name}, rank ${p.rank}, ${special}`:`${coord}. Empty ${special}`;}
  function renderHistory(){if(!moveLog.length){historyHost.innerHTML='<i>No moves yet</i>';return;}historyHost.innerHTML=moveLog.slice(-8).reverse().map(item=>{const info=ANIMAL_CHESS_PIECES[item.type],captured=item.capturedType?ANIMAL_CHESS_PIECES[item.capturedType]:null;return`<span class="animal-chess-movechip" title="${sideLabel(item.side)} ${info.name}: ${item.from} to ${item.to}${captured?`, captured ${captured.name}`:''}"><b>${item.no}</b><i class="${item.side}">${info.han}</i><em>${item.from}</em><strong>${captured?'×':'→'}</strong><em>${item.to}</em>${captured?`<small>${captured.han}</small>`:''}</span>`;}).join('');}
  function renderResult(){if(!state.winner&&!state.draw){resultHost.hidden=true;resultHost.innerHTML='';return;}resultHost.hidden=false;const captures=16-state.pieces.length;if(state.draw)resultHost.innerHTML=`<span>MATCH COMPLETE</span><strong>Draw</strong><small>${state.moves} moves · ${captures} captures · 120 non-capture move limit</small><button type="button" data-play-again>Play Again</button>`;else resultHost.innerHTML=`<span>VICTORY</span><strong class="${state.winner}">${sideLabel(state.winner)} wins</strong><small>${winnerReason()} · ${state.moves} moves · ${captures} captures</small><button type="button" data-play-again>Play Again</button>`;}
  function tacticalMessage(){if(state.winner)return`${sideLabel(state.winner)} victory · ${winnerReason()}`;if(state.draw)return'Draw · no capture for 120 moves';if(busy)return`CPU ${aiLevel==='hard'?'Expert':aiLevel==='easy'?'Easy':'Smart'} · calculating tactical reply`;if(selectedId){const p=state.pieces.find(item=>item.id===selectedId),moves=animalChessLegalMoves(state,selectedId),captures=moves.filter(move=>move.capture).length,wins=moves.filter(move=>move.den===opponent(p.side)).length;return`${ANIMAL_CHESS_PIECES[p.type].han} ${ANIMAL_CHESS_PIECES[p.type].name} · rank ${p.rank} · ${moves.length} legal move${moves.length===1?'':'s'}${captures?` · ${captures} capture${captures===1?'':'s'}`:''}${wins?' · winning den move available':''}`;}const immediateWins=animalChessAllLegalMoves(state,state.turn).filter(move=>move.den===opponent(state.turn)).length;return`${mode==='cpu'?'VS CPU':'LOCAL MATCH'} · ${sideLabel(state.turn)} to move${immediateWins?' · den entry available':''}`;}

  function render(){
    const moves=legalTargets(),moveMap=new Map(moves.map(m=>[key(m.r,m.c),m]));board.innerHTML='';board.classList.toggle('thinking',busy);
    for(let r=0;r<ANIMAL_CHESS_ROWS;r++)for(let c=0;c<ANIMAL_CHESS_COLS;c++){
      const p=animalChessPieceAt(state,r,c),cell=document.createElement('button'),move=moveMap.get(key(r,c));cell.type='button';cell.className='animal-chess-cell';cell.dataset.row=r;cell.dataset.col=c;cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',cellLabel(r,c,p));cell.setAttribute('aria-selected',String(Boolean(p&&selectedId===p.id)));cell.tabIndex=r===focusCell.r&&c===focusCell.c?0:-1;cell.disabled=busy;
      if(isAnimalChessRiver(r,c)){cell.classList.add('river');cell.insertAdjacentHTML('beforeend','<span class="animal-chess-water" aria-hidden="true"></span>');}
      const den=animalChessDenOwner(r,c),trap=animalChessTrapOwner(r,c);if(den){cell.classList.add('den',`den-${den}`);cell.insertAdjacentHTML('beforeend',`<span class="animal-chess-terrain"><b>◆</b>${sideLabel(den)} DEN</span>`);}else if(trap){cell.classList.add('trap',`trap-${trap}`);cell.insertAdjacentHTML('beforeend','<span class="animal-chess-terrain"><b>✦</b>TRAP</span>');}
      if(state.lastMove&&((state.lastMove.fromR===r&&state.lastMove.fromC===c)||(state.lastMove.toR===r&&state.lastMove.toC===c)))cell.classList.add('last');if(state.lastMove?.capturedId&&state.lastMove.toR===r&&state.lastMove.toC===c)cell.classList.add('last-capture');
      if(p){const info=ANIMAL_CHESS_PIECES[p.type],pieceEl=document.createElement('span'),arrived=state.lastMove?.pieceId===p.id&&state.lastMove.toR===r&&state.lastMove.toC===c&&Date.now()-lastMoveAt<700;pieceEl.className=`animal-chess-piece ${p.side}${selectedId===p.id?' selected':''}${arrived?' arrived':''}`;pieceEl.innerHTML=`<span class="animal-chess-rank">${p.rank}</span><strong class="animal-chess-han">${info.han}</strong><small>${info.name}</small>`;cell.appendChild(pieceEl);}
      if(move)cell.classList.add(move.capture?'capture-target':'move-target');board.appendChild(cell);
    }
    renderPlayer('blue',bluePlayer);renderPlayer('red',redPlayer);renderHistory();renderResult();tactical.textContent=tacticalMessage();
    const modeText=mode==='cpu'?`VS CPU · ${aiLevel==='hard'?'EXPERT':aiLevel==='easy'?'EASY':'SMART'}`:'LOCAL · 2 PLAYERS';
    if(state.winner)matchbar.innerHTML=`<span class="animal-chess-turnorb ${state.winner}"></span><div><b class="${state.winner}">${sideLabel(state.winner)} wins</b><small>${winnerReason()}</small></div><em>${state.moves} MOVES · ${modeText}</em>`;else if(state.draw)matchbar.innerHTML=`<span class="animal-chess-turnorb"></span><div><b>Draw</b><small>120 moves without a capture.</small></div><em>${state.moves} MOVES · ${modeText}</em>`;else matchbar.innerHTML=`<span class="animal-chess-turnorb ${state.turn}${busy?' pulse':''}"></span><div><b class="${state.turn}">${busy?'Blue is thinking…':`${sideLabel(state.turn)} to move`}</b><small>${busy?'Computer is choosing a move.':selectedId?'Choose a highlighted square.':'Select one of your animals.'}</small></div><em>MOVE ${state.moves+1} · ${modeText}</em>`;
    undo.disabled=!history.length||busy;announce();
    if(restoreBoardFocus){restoreBoardFocus=false;requestAnimationFrame(()=>board.querySelector(`[data-row="${focusCell.r}"][data-col="${focusCell.c}"]`)?.focus());}
  }

  function logMove(before,pieceId,toR,toC){const moving=before.pieces.find(p=>p.id===pieceId),captured=before.pieces.find(p=>p.r===toR&&p.c===toC&&p.side!==moving.side);moveLog.push({no:before.moves+1,side:moving.side,type:moving.type,from:coordinate(moving.r,moving.c),to:coordinate(toR,toC),capturedType:captured?.type||''});}
  function snapshot(){history.push({state:cloneState(state),log:moveLog.map(item=>({...item}))});}
  function performMove(pieceId,toR,toC){const before=cloneState(state),target=animalChessPieceAt(state,toR,toC);snapshot();logMove(before,pieceId,toR,toC);state=applyAnimalChessMove(state,pieceId,toR,toC);selectedId=null;focusCell={r:toR,c:toC};lastMoveAt=Date.now();playSound(state.winner?'win':target?'capture':'move');render();scheduleAi();}
  function choose(r,c){if(state.winner||state.draw||busy)return;if(mode==='cpu'&&state.turn==='blue')return;focusCell={r,c};const clicked=animalChessPieceAt(state,r,c),move=selectedId?animalChessLegalMoves(state,selectedId).find(m=>m.r===r&&m.c===c):null;if(move){performMove(selectedId,r,c);return;}if(clicked?.side===state.turn){selectedId=selectedId===clicked.id?null:clicked.id;playSound('select');render();return;}selectedId=null;render();}
  function cancelAi(){if(aiTimer)clearTimeout(aiTimer);aiTimer=0;busy=false;}
  function scheduleAi(){if(mode!=='cpu'||state.turn!=='blue'||state.winner||state.draw||destroyed)return;cancelAi();busy=true;render();aiTimer=setTimeout(()=>{aiTimer=0;if(destroyed||mode!=='cpu'||state.turn!=='blue'||state.winner||state.draw){busy=false;render();return;}const action=chooseAnimalChessAiMove(state,aiLevel,'blue');busy=false;if(action)performMove(action.pieceId,action.r,action.c);else render();},aiLevel==='hard'?560:420);}
  function restartGame(withSound=true){cancelAi();state=createAnimalChessState();history=[];moveLog=[];selectedId=null;focusCell={r:8,c:0};lastMoveAt=0;if(withSound)playSound('move');render();if(mode==='cpu')scheduleAi();}
  function undoGame(){if(!history.length)return;cancelAi();let shot=history.pop();state=shot.state;moveLog=shot.log;if(mode==='cpu'&&state.turn==='blue'&&history.length){shot=history.pop();state=shot.state;moveLog=shot.log;}selectedId=null;focusCell=state.lastMove?{r:state.lastMove.toR,c:state.lastMove.toC}:{r:8,c:0};lastMoveAt=0;playSound('undo');render();}
  function moveFocus(dr,dc){focusCell={r:Math.max(0,Math.min(ANIMAL_CHESS_ROWS-1,focusCell.r+dr)),c:Math.max(0,Math.min(ANIMAL_CHESS_COLS-1,focusCell.c+dc))};restoreBoardFocus=true;render();}

  board.addEventListener('click',event=>{const cell=event.target.closest('.animal-chess-cell');if(cell)choose(Number(cell.dataset.row),Number(cell.dataset.col));});
  board.addEventListener('focusin',event=>{const cell=event.target.closest('.animal-chess-cell');if(cell)focusCell={r:Number(cell.dataset.row),c:Number(cell.dataset.col)};});
  board.addEventListener('keydown',event=>{if(event.key==='ArrowUp'){event.preventDefault();moveFocus(-1,0);}else if(event.key==='ArrowDown'){event.preventDefault();moveFocus(1,0);}else if(event.key==='ArrowLeft'){event.preventDefault();moveFocus(0,-1);}else if(event.key==='ArrowRight'){event.preventDefault();moveFocus(0,1);}else if(event.key==='Home'){event.preventDefault();focusCell={r:focusCell.r,c:0};restoreBoardFocus=true;render();}else if(event.key==='End'){event.preventDefault();focusCell={r:focusCell.r,c:ANIMAL_CHESS_COLS-1};restoreBoardFocus=true;render();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();restoreBoardFocus=true;choose(focusCell.r,focusCell.c);}else if(event.key==='Escape'&&selectedId){event.preventDefault();selectedId=null;restoreBoardFocus=true;render();}});
  host.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.mode;if(next===mode)return;mode=next;savePreferences();syncToolbar();restartGame();}));
  host.querySelectorAll('[data-ai]').forEach(button=>button.addEventListener('click',()=>{aiLevel=button.dataset.ai;savePreferences();syncToolbar();if(busy){cancelAi();scheduleAi();}else render();}));
  sound.addEventListener('click',()=>{soundOn=!soundOn;savePreferences();syncToolbar();if(soundOn)playSound('select');});undo.addEventListener('click',undoGame);restart.addEventListener('click',()=>restartGame());resultHost.addEventListener('click',event=>{if(event.target.closest('[data-play-again]'))restartGame();});
  syncToolbar();render();if(mode==='cpu'&&state.turn==='blue')scheduleAi();

  return{supportsUndo:true,reset(){restartGame(false);},hint(){return false;},solution(){},hideSolution(){},previewScore(){return 0;},getResult(){return{score:0,metadata:{moves:state.moves,winner:state.winner||'',draw:state.draw,mode,aiLevel:mode==='cpu'?aiLevel:''}};},destroy(){destroyed=true;cancelAi();try{audioContext?.close();}catch{}}};
}
