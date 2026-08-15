import {rngFromSeed,shuffle,orthogonalNeighbors,rcOf,indexOf,scoreFromPerformance,scoreTimeDivisor,directionLabel} from './utils.js';

const N=1,E=2,S=4,W=8;
const OPPOSITE={[N]:S,[E]:W,[S]:N,[W]:E};
const LEVEL={easy:{size:11,candidates:14,rank:.05},medium:{size:13,candidates:20,rank:.56},hard:{size:15,candidates:28,rank:.98}};

function directionBetween(a,b,cols){const[ar,ac]=rcOf(a,cols),[br,bc]=rcOf(b,cols);if(br===ar-1)return N;if(bc===ac+1)return E;if(br===ar+1)return S;if(bc===ac-1)return W;return 0;}
function generateCandidate(size,seed){
  const total=size*size,walls=new Uint8Array(total).fill(N|E|S|W),visited=new Uint8Array(total),rng=rngFromSeed(seed),stack=[0];visited[0]=1;
  while(stack.length){const current=stack[stack.length-1],candidates=shuffle(orthogonalNeighbors(current,size,size).filter(n=>!visited[n]),rng);if(!candidates.length){stack.pop();continue;}const next=candidates[0],dir=directionBetween(current,next,size);walls[current]&=~dir;walls[next]&=~OPPOSITE[dir];visited[next]=1;stack.push(next);}
  return{size,walls:Array.from(walls),start:0,end:total-1,seed};
}
export function solveMaze(maze,from=maze.start,to=maze.end){
  const{size,walls}=maze,queue=[from],previous=new Int32Array(size*size).fill(-1);previous[from]=from;
  for(let qi=0;qi<queue.length;qi++){const current=queue[qi];if(current===to)break;const[row,col]=rcOf(current,size),options=[];if(!(walls[current]&N)&&row>0)options.push(indexOf(row-1,col,size));if(!(walls[current]&E)&&col<size-1)options.push(indexOf(row,col+1,size));if(!(walls[current]&S)&&row<size-1)options.push(indexOf(row+1,col,size));if(!(walls[current]&W)&&col>0)options.push(indexOf(row,col-1,size));for(const next of options){if(previous[next]!==-1)continue;previous[next]=current;queue.push(next);}}
  if(previous[to]===-1)return[];const path=[];let cursor=to;while(cursor!==from){path.push(cursor);cursor=previous[cursor];}path.push(from);return path.reverse();
}
function openDegree(maze,index){const mask=maze.walls[index];let degree=0;if(!(mask&N))degree++;if(!(mask&E))degree++;if(!(mask&S))degree++;if(!(mask&W))degree++;return degree;}
function pathTurns(path,size){let turns=0,lastDir=0;for(let i=1;i<path.length;i++){const dir=directionBetween(path[i-1],path[i],size);if(lastDir&&dir!==lastDir)turns++;lastDir=dir;}return turns;}
export function mazeComplexity(maze){
  const solution=solveMaze(maze),turns=pathTurns(solution,maze.size),decisions=solution.filter(index=>openDegree(maze,index)>=3).length,deadEnds=maze.walls.filter((_,index)=>openDegree(maze,index)===1).length;
  const direct=Math.max(1,(maze.size-1)*2),detour=solution.length/direct;
  return{solutionLength:solution.length,turns,decisions,deadEnds,detour,score:solution.length+turns*5.5+decisions*11+deadEnds*1.6+detour*18};
}
export function generateMaze(difficulty='easy',seed='maze'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,candidates=[];
  for(let i=0;i<cfg.candidates;i++){const maze=generateCandidate(cfg.size,`${seed}:candidate:${i}`);candidates.push({...maze,complexity:mazeComplexity(maze)});}
  candidates.sort((a,b)=>a.complexity.score-b.complexity.score);const chosen=candidates[Math.min(candidates.length-1,Math.max(0,Math.round((candidates.length-1)*cfg.rank)))];
  return{...chosen,seed,difficulty};
}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete}){
  let maze=generateMaze(difficulty,seed),fullSolution=solveMaze(maze),player=maze.start,moves=0,shownSolution=false,hintCells=[],destroyed=false,canvas,ctx,displaySize=560;
  host.innerHTML='<div class="maze-stage"><canvas class="maze-canvas" aria-label="Maze board. Drag, swipe, click adjacent cells, or use Arrow and WASD keys."></canvas></div>';
  canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');

  function draw(){
    if(destroyed)return;const rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);displaySize=Math.max(260,Math.floor(rect.width||host.clientWidth||560));canvas.width=displaySize*ratio;canvas.height=displaySize*ratio;canvas.style.height=`${displaySize}px`;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,displaySize,displaySize);const cell=displaySize/maze.size;
    ctx.fillStyle='#0d1222';ctx.fillRect(0,0,displaySize,displaySize);
    if(shownSolution){ctx.strokeStyle='rgba(40,201,245,.66)';ctx.lineWidth=Math.max(3,cell*.18);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();fullSolution.forEach((idx,i)=>{const[r,c]=rcOf(idx,maze.size),x=(c+.5)*cell,y=(r+.5)*cell;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}
    hintCells.forEach((idx,i)=>{const[r,c]=rcOf(idx,maze.size);ctx.fillStyle=i===0?'rgba(55,217,154,.45)':'rgba(40,201,245,.22)';ctx.fillRect(c*cell+2,r*cell+2,cell-4,cell-4);ctx.fillStyle='#f5f7fc';ctx.font=`700 ${Math.max(9,cell*.28)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),(c+.5)*cell,(r+.5)*cell);});
    ctx.strokeStyle='#66708a';ctx.lineWidth=Math.max(1.4,cell*.07);ctx.beginPath();maze.walls.forEach((mask,idx)=>{const[r,c]=rcOf(idx,maze.size),x=c*cell,y=r*cell;if(mask&N){ctx.moveTo(x,y);ctx.lineTo(x+cell,y);}if(mask&W){ctx.moveTo(x,y);ctx.lineTo(x,y+cell);}if(r===maze.size-1&&mask&S){ctx.moveTo(x,y+cell);ctx.lineTo(x+cell,y+cell);}if(c===maze.size-1&&mask&E){ctx.moveTo(x+cell,y);ctx.lineTo(x+cell,y+cell);}});ctx.stroke();
    const marker=(idx,color,scale)=>{const[r,c]=rcOf(idx,maze.size);ctx.beginPath();ctx.fillStyle=color;ctx.arc((c+.5)*cell,(r+.5)*cell,Math.max(4,cell*scale),0,Math.PI*2);ctx.fill();};marker(maze.end,'#37d99a',.23);marker(player,'#7357ff',.27);
  }
  function canMove(to){const dir=directionBetween(player,to,maze.size);return dir&&!(maze.walls[player]&dir);}
  function moveTo(next){if(!canMove(next))return false;player=next;moves++;hintCells=[];onMetrics({moves});onStatus(player===maze.end?(shownSolution?'Practice complete — you reached the finish using the guide.':'Maze complete.'):'Keep going. Find the green finish.');draw();if(player===maze.end)onComplete();return true;}
  function moveDirection(name){const[r,c]=rcOf(player,maze.size),target=name==='up'&&r>0?indexOf(r-1,c,maze.size):name==='right'&&c<maze.size-1?indexOf(r,c+1,maze.size):name==='down'&&r<maze.size-1?indexOf(r+1,c,maze.size):name==='left'&&c>0?indexOf(r,c-1,maze.size):-1;return target>=0?moveTo(target):false;}
  const keyHandler=e=>{const map={ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left',w:'up',d:'right',s:'down',a:'left',W:'up',D:'right',S:'down',A:'left'},dir=map[e.key];if(!dir)return;e.preventDefault();moveDirection(dir);};window.addEventListener('keydown',keyHandler);

  function cellAt(clientX,clientY){const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return-1;const col=Math.min(maze.size-1,Math.floor(x/rect.width*maze.size)),row=Math.min(maze.size-1,Math.floor(y/rect.height*maze.size));return indexOf(row,col,maze.size);}
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);drag={x:e.clientX,y:e.clientY,startIndex:cellAt(e.clientX,e.clientY),moved:false};});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const threshold=Math.max(8,(displaySize/maze.size)*.28);let dx=e.clientX-drag.x,dy=e.clientY-drag.y,guard=0;while(Math.max(Math.abs(dx),Math.abs(dy))>=threshold&&guard++<8){const horizontal=Math.abs(dx)>Math.abs(dy),dir=horizontal?(dx>0?'right':'left'):(dy>0?'down':'up');const moved=moveDirection(dir);drag.moved=drag.moved||moved;if(horizontal)drag.x+=dx>0?threshold:-threshold;else drag.y+=dy>0?threshold:-threshold;dx=e.clientX-drag.x;dy=e.clientY-drag.y;if(!moved&&Math.max(Math.abs(dx),Math.abs(dy))>threshold*2){drag.x=e.clientX;drag.y=e.clientY;break;}}});
  const finishPointer=e=>{if(!drag)return;if(!drag.moved){const target=cellAt(e.clientX,e.clientY);if(target>=0&&target!==player)moveTo(target);}drag=null;};canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',()=>drag=null);
  window.addEventListener('resize',draw);

  onMetrics({moves:0,hints:0,score:5000});onStatus('Reach the green finish. Hold and drag, swipe, click an adjacent cell, or use Arrow/WASD keys.');requestAnimationFrame(draw);
  const timeDivisor=scoreTimeDivisor('maze',difficulty);
  return{
    supportsUndo:false,
    reset(){player=maze.start;moves=0;hintCells=[];shownSolution=false;onMetrics({moves:0});onStatus('Puzzle reset. Reach the green finish.');draw();},
    hint(){if(shownSolution)return false;const path=solveMaze(maze,player,maze.end);hintCells=path.slice(1,4);if(!hintCells.length)return false;draw();const directions=[];let from=player;for(const next of hintCells){directions.push(directionLabel(from,next,maze.size));from=next;}onStatus(`Hint: next ${hintCells.length} move${hintCells.length>1?'s':''} — ${directions.join(' → ')}. Follow the numbered highlights.`);setTimeout(()=>{hintCells=[];draw();},4200);return true;},
    solution(){shownSolution=true;hintCells=[];fullSolution=solveMaze(maze,maze.start,maze.end);onStatus('Full route shown in cyan. You can keep moving along it; this attempt is practice-only.');draw();},
    hideSolution(){shownSolution=false;hintCells=[];onStatus('Solution hidden. Keep playing, or Reset Puzzle to restore ranking eligibility.');draw();},
    previewScore(timeMs,hints=0){const ideal=Math.max(1,fullSolution.length-1);return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-ideal)*14,hintPenalty:hints*180});},
    getResult(timeMs,hints=0){const ideal=Math.max(1,solveMaze(maze).length-1);return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-ideal)*14,hintPenalty:hints*180}),metadata:{moves,ideal_moves:ideal,size:maze.size,complexity:maze.complexity}};},
    destroy(){destroyed=true;window.removeEventListener('keydown',keyHandler);window.removeEventListener('resize',draw);}
  };
}
