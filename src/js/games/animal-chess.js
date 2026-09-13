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
  const defenderRank=effectiveRank(defender,toR,toC);
  if(defenderRank===0)return true;
  if(attacker.type==='rat'&&defender.type==='elephant')return !fromWater&&!toWater;
  if(attacker.type==='elephant'&&defender.type==='rat')return false;
  return effectiveRank(attacker,fromR,fromC)>=defenderRank;
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
  if(isAnimalChessRiver(r,c)){
    if(pieceValue.type==='rat')return{r,c,jump:false};
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

export function createGame({host,onMetrics=()=>{},onStatus=()=>{}}){
  if(typeof document!=='undefined'&&!document.querySelector('link[data-animal-chess-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/styles/animal-chess.css';link.dataset.animalChessStyle='true';document.head.appendChild(link);}
  let state=createAnimalChessState(),selectedId=null,history=[];
  host.innerHTML=`<div class="animal-chess-app"><div class="animal-chess-head"><div><span class="animal-chess-kicker">LOCAL 2 PLAYERS</span><strong>Animal Chess</strong><small>Red moves first · reach the enemy den</small></div><div class="animal-chess-actions"><button id="animalChessUndo" type="button" disabled>↶ Undo</button><button id="animalChessRestart" type="button">Restart</button></div></div><div class="animal-chess-turn" id="animalChessTurn"></div><div class="animal-chess-board" id="animalChessBoard" role="grid" aria-label="Animal Chess board"></div><div class="animal-chess-rankbar"><span>Rank</span><b>🐘 8</b><b>🦁 7</b><b>🐯 6</b><b>🐆 5</b><b>🐺 4</b><b>🐕 3</b><b>🐈 2</b><b>🐀 1</b></div></div>`;
  const board=host.querySelector('#animalChessBoard'),turnHost=host.querySelector('#animalChessTurn'),undo=host.querySelector('#animalChessUndo'),restart=host.querySelector('#animalChessRestart');
  const sideName=side=>side==='red'?'Red':'Blue',sideCount=side=>state.pieces.filter(p=>p.side===side).length,legalTargets=()=>selectedId?animalChessLegalMoves(state,selectedId):[];
  function announce(){onMetrics({turn:state.draw?'Draw':state.winner?`${sideName(state.winner)} wins`:sideName(state.turn),red:sideCount('red'),blue:sideCount('blue'),moves:state.moves});if(state.winner)onStatus(`${sideName(state.winner)} wins Animal Chess.`);else if(state.draw)onStatus('Draw after 120 moves without a capture.');else onStatus(`${sideName(state.turn)} to move.`);}
  function cellLabel(r,c,p){const special=animalChessDenOwner(r,c)?`${sideName(animalChessDenOwner(r,c))} den`:animalChessTrapOwner(r,c)?`${sideName(animalChessTrapOwner(r,c))} trap`:isAnimalChessRiver(r,c)?'river':'land';return p?`${sideName(p.side)} ${ANIMAL_CHESS_PIECES[p.type].name}, rank ${p.rank}, ${special}`:`Empty ${special}`;}
  function render(){
    const moves=legalTargets(),moveMap=new Map(moves.map(m=>[key(m.r,m.c),m]));board.innerHTML='';
    for(let r=0;r<ANIMAL_CHESS_ROWS;r++)for(let c=0;c<ANIMAL_CHESS_COLS;c++){
      const p=animalChessPieceAt(state,r,c),cell=document.createElement('button'),move=moveMap.get(key(r,c));cell.type='button';cell.className='animal-chess-cell';cell.dataset.row=r;cell.dataset.col=c;cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',cellLabel(r,c,p));
      if(isAnimalChessRiver(r,c))cell.classList.add('river');const den=animalChessDenOwner(r,c),trap=animalChessTrapOwner(r,c);if(den){cell.classList.add('den',`den-${den}`);cell.insertAdjacentHTML('beforeend','<span class="animal-chess-terrain">DEN</span>');}else if(trap){cell.classList.add('trap',`trap-${trap}`);cell.insertAdjacentHTML('beforeend','<span class="animal-chess-terrain">TRAP</span>');}
      if(state.lastMove&&((state.lastMove.fromR===r&&state.lastMove.fromC===c)||(state.lastMove.toR===r&&state.lastMove.toC===c)))cell.classList.add('last');
      if(p){const info=ANIMAL_CHESS_PIECES[p.type],pieceEl=document.createElement('span');pieceEl.className=`animal-chess-piece ${p.side}${selectedId===p.id?' selected':''}`;pieceEl.innerHTML=`<span class="animal-chess-icon">${info.icon}</span><b>${info.han}</b><small>${p.rank}</small>`;cell.appendChild(pieceEl);}
      if(move){cell.classList.add(move.capture?'capture-target':'move-target');cell.insertAdjacentHTML('beforeend',`<i>${move.capture?'×':'•'}</i>`);}board.appendChild(cell);
    }
    if(state.winner)turnHost.innerHTML=`<b class="${state.winner}">${sideName(state.winner)} wins</b><span>Reached the den, captured every rival, or left no legal move.</span>`;else if(state.draw)turnHost.innerHTML='<b>Draw</b><span>120 moves without a capture.</span>';else turnHost.innerHTML=`<b class="${state.turn}">${sideName(state.turn)} to move</b><span>${selectedId?'Choose a highlighted square.':'Select one of your animals.'}</span>`;
    undo.disabled=!history.length;announce();
  }
  function choose(r,c){if(state.winner||state.draw)return;const clicked=animalChessPieceAt(state,r,c),move=selectedId?animalChessLegalMoves(state,selectedId).find(m=>m.r===r&&m.c===c):null;if(move){history.push(cloneState(state));state=applyAnimalChessMove(state,selectedId,r,c);selectedId=null;render();return;}if(clicked?.side===state.turn){selectedId=selectedId===clicked.id?null:clicked.id;render();return;}selectedId=null;render();}
  board.addEventListener('click',event=>{const cell=event.target.closest('.animal-chess-cell');if(cell)choose(Number(cell.dataset.row),Number(cell.dataset.col));});undo.addEventListener('click',()=>{if(!history.length)return;state=history.pop();selectedId=null;render();});restart.addEventListener('click',()=>{state=createAnimalChessState();history=[];selectedId=null;render();});render();
  return{supportsUndo:true,reset(){state=createAnimalChessState();history=[];selectedId=null;render();},hint(){return false;},solution(){},hideSolution(){},previewScore(){return 0;},getResult(){return{score:0,metadata:{moves:state.moves,winner:state.winner||'',draw:state.draw}};},destroy(){}};
}
