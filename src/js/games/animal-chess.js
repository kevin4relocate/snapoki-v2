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

const key=(r,c)=>`${r},${c}`;
const inBounds=(r,c)=>r>=0&&r<ANIMAL_CHESS_ROWS&&c>=0&&c<ANIMAL_CHESS_COLS;
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
export function generateAnimalChess(difficulty='local',seed='animal-chess:local'){const state=createAnimalChessState();return{...state,difficulty,seed,pieces:state.pieces.map(p=>({...p}))};}

export function animalChessPieceAt(state,r,c){return state.pieces.find(p=>p.r===r&&p.c===c)||null;}
function cloneState(state){return{...state,pieces:state.pieces.map(p=>({...p})),lastMove:state.lastMove?{...state.lastMove}:null};}
function opponent(side){return side==='red'?'blue':'red';}
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
export function animalChessHasLegalMove(state,side){return state.pieces.some(p=>p.side===side&&animalChessLegalMoves({...state,turn:side},p.id).length>0);}
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
  else{next.turn=enemy;if(!animalChessHasLegalMove(next,enemy))next.winner=moving.side;else if(next.noCaptureMoves>=120)next.draw=true;}
  return next;
}

function materialScore(state,side){return state.pieces.reduce((score,p)=>score+(p.side===side?1:-1)*(p.rank*11+8),0);}
function denPressure(state,side){const enemy=opponent(side),[denR,denC]=DENS[enemy].split(',').map(Number);return state.pieces.filter(p=>p.side===side).reduce((score,p)=>score+(14-(Math.abs(p.r-denR)+Math.abs(p.c-denC)))*1.35,0);}
function trapScore(state,side){return state.pieces.reduce((score,p)=>{const owner=animalChessTrapOwner(p.r,p.c);if(!owner||owner===p.side)return score;return score+(p.side===side?-20:20);},0);}
function positionScore(state,side){if(state.winner===side)return 100000;if(state.winner===opponent(side))return -100000;if(state.draw)return 0;return materialScore(state,side)+denPressure(state,side)+trapScore(state,side);}
function actionTie(action){let hash=2166136261;const text=`${action.pieceId}:${action.r}:${action.c}`;for(const ch of text){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function immediateActionScore(state,action,side){
  const moving=state.pieces.find(p=>p.id===action.pieceId),captured=action.capture?state.pieces.find(p=>p.id===action.capture):null;let score=0;
  if(action.den===opponent(side))score+=90000;if(captured)score+=36+captured.rank*14+(captured.type==='elephant'?18:0);if(action.jump)score+=5;
  const trapOwner=animalChessTrapOwner(action.r,action.c);if(trapOwner===opponent(side))score-=26+moving.rank*2;
  const [denR,denC]=DENS[opponent(side)].split(',').map(Number),before=Math.abs(moving.r-denR)+Math.abs(moving.c-denC),after=Math.abs(action.r-denR)+Math.abs(action.c-denC);score+=(before-after)*3;return score;
}
export function chooseAnimalChessAiMove(state,difficulty='medium',side=state.turn){
  if(state.winner||state.draw||state.turn!==side)return null;
  const actions=animalChessAllLegalMoves(state,side);if(!actions.length)return null;
  const ranked=actions.map(action=>{const after=applyAnimalChessMove({...state,turn:side},action.pieceId,action.r,action.c);let score=immediateActionScore(state,action,side)+positionScore(after,side)*.32;
    if(difficulty==='hard'&&!after.winner&&!after.draw){const replies=animalChessAllLegalMoves(after,after.turn);if(replies.length){let worst=Infinity;for(const reply of replies){const replyState=applyAnimalChessMove(after,reply.pieceId,reply.r,reply.c);const value=positionScore(replyState,side)+immediateActionScore(after,reply,after.turn)*-1.25;if(value<worst)worst=value;}score+=worst*.7;}}
    return{...action,score,tie:actionTie(action)};}).sort((a,b)=>b.score-a.score||a.tie-b.tie);
  if(difficulty==='easy')return ranked[Math.min(state.moves%Math.min(3,ranked.length),ranked.length-1)];return ranked[0];
}

export function createGame({host,onMetrics=()=>{},onStatus=()=>{}}){
  if(typeof document!=='undefined'&&!document.querySelector('link[data-animal-chess-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/styles/animal-chess.css';link.dataset.animalChessStyle='true';document.head.appendChild(link);}
  let state=createAnimalChessState(),selectedId=null,history=[],moveLog=[],mode='local',aiLevel='medium',aiTimer=0,busy=false,lastMoveAt=0,soundOn=true,audioContext=null,destroyed=false;
  host.innerHTML=`<div class="animal-chess-app"><div class="animal-chess-command"><div class="animal-chess-titleblock"><span class="animal-chess-kicker">DOU SHOU QI · 斗兽棋</span><strong>Animal Chess</strong><small>Classic jungle strategy · premium board</small></div><div class="animal-chess-toolbar"><div class="animal-chess-segment" role="group" aria-label="Game mode"><button type="button" data-mode="local" class="active">2 Players</button><button type="button" data-mode="cpu">vs CPU</button></div><div class="animal-chess-cpu-level" id="animalChessCpuLevel" hidden aria-label="Computer difficulty"><button type="button" data-ai="easy">Easy</button><button type="button" data-ai="medium" class="active">Smart</button><button type="button" data-ai="hard">Expert</button></div><button id="animalChessSound" class="animal-chess-iconbtn" type="button" aria-label="Mute sound" title="Sound">🔊</button><button id="animalChessUndo" class="animal-chess-iconbtn" type="button" disabled aria-label="Undo last turn" title="Undo">↶</button><button id="animalChessRestart" class="animal-chess-new" type="button">New Game</button></div></div><div class="animal-chess-matchbar" id="animalChessMatchbar"><span class="animal-chess-turnorb red"></span><div><b>Red to move</b><small>Select one of your animals.</small></div><em>MOVE 1</em></div><div class="animal-chess-arena"><aside class="animal-chess-player blue" id="animalChessBluePlayer"></aside><main class="animal-chess-center"><div class="animal-chess-boardframe"><div class="animal-chess-board" id="animalChessBoard" role="grid" aria-label="Animal Chess board"></div><div class="animal-chess-result" id="animalChessResult" hidden></div></div><div class="animal-chess-rulebar"><span><b>鼠</b> Rat beats Elephant</span><span><b>狮 / 虎</b> leap rivers</span><span><b>✦</b> enemy trap = rank 0</span><span><b>◆</b> enemy den = win</span></div></main><aside class="animal-chess-player red" id="animalChessRedPlayer"></aside></div><div class="animal-chess-history"><span>MOVE HISTORY</span><div id="animalChessHistory"><i>No moves yet</i></div></div></div>`;
  const board=host.querySelector('#animalChessBoard'),matchbar=host.querySelector('#animalChessMatchbar'),undo=host.querySelector('#animalChessUndo'),restart=host.querySelector('#animalChessRestart'),sound=host.querySelector('#animalChessSound'),cpuLevelHost=host.querySelector('#animalChessCpuLevel'),bluePlayer=host.querySelector('#animalChessBluePlayer'),redPlayer=host.querySelector('#animalChessRedPlayer'),historyHost=host.querySelector('#animalChessHistory'),resultHost=host.querySelector('#animalChessResult');
  const sideName=side=>side==='red'?'Red':'Blue',sideCount=side=>state.pieces.filter(p=>p.side===side).length,legalTargets=()=>selectedId?animalChessLegalMoves(state,selectedId):[];
  function playSound(kind){if(!soundOn||typeof window==='undefined')return;const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;try{audioContext ||= new AudioCtx();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);const map={select:[420,.045,'sine'],move:[310,.07,'triangle'],capture:[170,.12,'square'],win:[560,.24,'sine'],undo:[250,.06,'triangle']};const [freq,duration,type]=map[kind]||map.move;osc.type=type;osc.frequency.setValueAtTime(freq,now);if(kind==='win')osc.frequency.exponentialRampToValueAtTime(820,now+duration);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='capture'?.035:.025,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.start(now);osc.stop(now+duration+.02);}catch{}}
  function winnerReason(){if(!state.winner)return'';const enemy=opponent(state.winner),last=state.lastMove;if(last&&DENS[enemy]===key(last.toR,last.toC))return'Enemy den captured';if(!state.pieces.some(p=>p.side===enemy))return'All rival animals captured';return'No legal moves remain';}
  function capturedTypes(side){const alive=new Set(state.pieces.filter(p=>p.side===side).map(p=>p.type));return START_TYPES.filter(type=>!alive.has(type));}
  function miniToken(type){const info=ANIMAL_CHESS_PIECES[type];return`<span class="animal-chess-mini" title="${info.name}"><b>${info.han}</b><small>${info.rank}</small></span>`;}
  function renderPlayer(side,el){const role=mode==='cpu'&&side==='blue'?'Computer':side==='red'?'Player 1':'Player 2',captured=capturedTypes(side),active=!state.winner&&!state.draw&&state.turn===side;el.className=`animal-chess-player ${side}${active?' active':''}`;el.innerHTML=`<div class="animal-chess-playerhead"><span class="animal-chess-side-dot"></span><div><strong>${sideName(side)}</strong><small>${role}</small></div>${active?'<em>TURN</em>':''}</div><div class="animal-chess-piececount"><b>${sideCount(side)}</b><span>animals left</span></div><div class="animal-chess-captured"><span>Lost</span><div>${captured.length?captured.map(miniToken).join(''):'<i>—</i>'}</div></div>`;}
  function announce(){onMetrics({turn:state.draw?'Draw':state.winner?`${sideName(state.winner)} wins`:sideName(state.turn),red:sideCount('red'),blue:sideCount('blue'),moves:state.moves});if(state.winner)onStatus(`${sideName(state.winner)} wins Animal Chess. ${winnerReason()}.`);else if(state.draw)onStatus('Draw after 120 moves without a capture.');else if(busy)onStatus('Blue computer is thinking.');else onStatus(`${sideName(state.turn)} to move.`);}
  function cellLabel(r,c,p){const special=animalChessDenOwner(r,c)?`${sideName(animalChessDenOwner(r,c))} den`:animalChessTrapOwner(r,c)?`${sideName(animalChessTrapOwner(r,c))} trap`:isAnimalChessRiver(r,c)?'river':'land';return p?`${sideName(p.side)} ${ANIMAL_CHESS_PIECES[p.type].name}, rank ${p.rank}, ${special}`:`Empty ${special}`;}
  function renderHistory(){if(!moveLog.length){historyHost.innerHTML='<i>No moves yet</i>';return;}historyHost.innerHTML=moveLog.slice(-6).reverse().map(item=>`<span class="animal-chess-movechip"><b>${item.no}</b><i class="${item.side}">${ANIMAL_CHESS_PIECES[item.type].han}</i>${item.capture?'<strong>×</strong>':'→'}<em>${String.fromCharCode(65+item.toC)}${ANIMAL_CHESS_ROWS-item.toR}</em></span>`).join('');}
  function renderResult(){if(!state.winner&&!state.draw){resultHost.hidden=true;resultHost.innerHTML='';return;}resultHost.hidden=false;if(state.draw)resultHost.innerHTML='<span>MATCH COMPLETE</span><strong>Draw</strong><small>120 moves without a capture.</small><button type="button" data-play-again>Play Again</button>';else resultHost.innerHTML=`<span>VICTORY</span><strong class="${state.winner}">${sideName(state.winner)} wins</strong><small>${winnerReason()}</small><button type="button" data-play-again>Play Again</button>`;}
  function render(){
    const moves=legalTargets(),moveMap=new Map(moves.map(m=>[key(m.r,m.c),m]));board.innerHTML='';board.classList.toggle('thinking',busy);
    for(let r=0;r<ANIMAL_CHESS_ROWS;r++)for(let c=0;c<ANIMAL_CHESS_COLS;c++){
      const p=animalChessPieceAt(state,r,c),cell=document.createElement('button'),move=moveMap.get(key(r,c));cell.type='button';cell.className='animal-chess-cell';cell.dataset.row=r;cell.dataset.col=c;cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',cellLabel(r,c,p));cell.disabled=busy;
      if(isAnimalChessRiver(r,c)){cell.classList.add('river');cell.insertAdjacentHTML('beforeend','<span class="animal-chess-water" aria-hidden="true"></span>');}const den=animalChessDenOwner(r,c),trap=animalChessTrapOwner(r,c);if(den){cell.classList.add('den',`den-${den}`);cell.insertAdjacentHTML('beforeend',`<span class="animal-chess-terrain"><b>◆</b>${sideName(den)} DEN</span>`);}else if(trap){cell.classList.add('trap',`trap-${trap}`);cell.insertAdjacentHTML('beforeend','<span class="animal-chess-terrain"><b>✦</b>TRAP</span>');}
      if(state.lastMove&&((state.lastMove.fromR===r&&state.lastMove.fromC===c)||(state.lastMove.toR===r&&state.lastMove.toC===c)))cell.classList.add('last');if(state.lastMove?.capturedId&&state.lastMove.toR===r&&state.lastMove.toC===c)cell.classList.add('last-capture');
      if(p){const info=ANIMAL_CHESS_PIECES[p.type],pieceEl=document.createElement('span'),arrived=state.lastMove?.pieceId===p.id&&state.lastMove.toR===r&&state.lastMove.toC===c&&Date.now()-lastMoveAt<700;pieceEl.className=`animal-chess-piece ${p.side}${selectedId===p.id?' selected':''}${arrived?' arrived':''}`;pieceEl.innerHTML=`<span class="animal-chess-rank">${p.rank}</span><strong class="animal-chess-han">${info.han}</strong><small>${info.name}</small>`;cell.appendChild(pieceEl);}if(move)cell.classList.add(move.capture?'capture-target':'move-target');board.appendChild(cell);
    }
    renderPlayer('blue',bluePlayer);renderPlayer('red',redPlayer);renderHistory();renderResult();
    if(state.winner)matchbar.innerHTML=`<span class="animal-chess-turnorb ${state.winner}"></span><div><b class="${state.winner}">${sideName(state.winner)} wins</b><small>${winnerReason()}</small></div><em>${state.moves} MOVES</em>`;else if(state.draw)matchbar.innerHTML=`<span class="animal-chess-turnorb"></span><div><b>Draw</b><small>120 moves without a capture.</small></div><em>${state.moves} MOVES</em>`;else matchbar.innerHTML=`<span class="animal-chess-turnorb ${state.turn}${busy?' pulse':''}"></span><div><b class="${state.turn}">${busy?'Blue is thinking…':`${sideName(state.turn)} to move`}</b><small>${busy?'Computer is choosing a move.':selectedId?'Choose a highlighted square.':'Select one of your animals.'}</small></div><em>MOVE ${state.moves+1}</em>`;undo.disabled=!history.length||busy;announce();
  }
  function logMove(before,pieceId,toR,toC){const moving=before.pieces.find(p=>p.id===pieceId),captured=before.pieces.find(p=>p.r===toR&&p.c===toC&&p.side!==moving.side);moveLog.push({no:before.moves+1,side:moving.side,type:moving.type,toR,toC,capture:Boolean(captured)});}
  function snapshot(){history.push({state:cloneState(state),log:moveLog.map(item=>({...item}))});}
  function performMove(pieceId,toR,toC){const before=cloneState(state),target=animalChessPieceAt(state,toR,toC);snapshot();logMove(before,pieceId,toR,toC);state=applyAnimalChessMove(state,pieceId,toR,toC);selectedId=null;lastMoveAt=Date.now();playSound(state.winner?'win':target?'capture':'move');render();scheduleAi();}
  function choose(r,c){if(state.winner||state.draw||busy)return;if(mode==='cpu'&&state.turn==='blue')return;const clicked=animalChessPieceAt(state,r,c),move=selectedId?animalChessLegalMoves(state,selectedId).find(m=>m.r===r&&m.c===c):null;if(move){performMove(selectedId,r,c);return;}if(clicked?.side===state.turn){selectedId=selectedId===clicked.id?null:clicked.id;playSound('select');render();return;}selectedId=null;render();}
  function cancelAi(){if(aiTimer)clearTimeout(aiTimer);aiTimer=0;busy=false;}
  function scheduleAi(){if(mode!=='cpu'||state.turn!=='blue'||state.winner||state.draw||destroyed)return;cancelAi();busy=true;render();aiTimer=setTimeout(()=>{aiTimer=0;if(destroyed||mode!=='cpu'||state.turn!=='blue'||state.winner||state.draw){busy=false;render();return;}const action=chooseAnimalChessAiMove(state,aiLevel,'blue');busy=false;if(action)performMove(action.pieceId,action.r,action.c);else render();},aiLevel==='hard'?520:420);}
  function restartGame(withSound=true){cancelAi();state=createAnimalChessState();history=[];moveLog=[];selectedId=null;lastMoveAt=0;if(withSound)playSound('move');render();}
  function undoGame(){if(!history.length)return;cancelAi();let shot=history.pop();state=shot.state;moveLog=shot.log;if(mode==='cpu'&&state.turn==='blue'&&history.length){shot=history.pop();state=shot.state;moveLog=shot.log;}selectedId=null;lastMoveAt=0;playSound('undo');render();}
  board.addEventListener('click',event=>{const cell=event.target.closest('.animal-chess-cell');if(cell)choose(Number(cell.dataset.row),Number(cell.dataset.col));});host.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.mode;if(next===mode)return;mode=next;host.querySelectorAll('[data-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===mode));cpuLevelHost.hidden=mode!=='cpu';restartGame();}));host.querySelectorAll('[data-ai]').forEach(button=>button.addEventListener('click',()=>{aiLevel=button.dataset.ai;host.querySelectorAll('[data-ai]').forEach(btn=>btn.classList.toggle('active',btn.dataset.ai===aiLevel));if(busy){cancelAi();scheduleAi();}}));sound.addEventListener('click',()=>{soundOn=!soundOn;sound.textContent=soundOn?'🔊':'🔇';sound.setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');if(soundOn)playSound('select');});undo.addEventListener('click',undoGame);restart.addEventListener('click',()=>restartGame());resultHost.addEventListener('click',event=>{if(event.target.closest('[data-play-again]'))restartGame();});render();
  return{supportsUndo:true,reset(){restartGame(false);},hint(){return false;},solution(){},hideSolution(){},previewScore(){return 0;},getResult(){return{score:0,metadata:{moves:state.moves,winner:state.winner||'',draw:state.draw,mode,aiLevel:mode==='cpu'?aiLevel:''}};},destroy(){destroyed=true;cancelAi();try{audioContext?.close();}catch{}}};
}
