import {rngFromSeed,shuffle,orthogonalNeighbors,rcOf,indexOf,scoreFromPerformance,scoreTimeDivisor,directionLabel} from './utils.js';

const N=1,E=2,S=4,W=8;
const OPPOSITE={[N]:S,[E]:W,[S]:N,[W]:E};
const LEVEL={easy:{size:11,candidates:14,rank:.05},medium:{size:13,candidates:22,rank:.58},hard:{size:15,candidates:32,rank:.985}};

function directionBetween(a,b,cols){const[ar,ac]=rcOf(a,cols),[br,bc]=rcOf(b,cols);if(br===ar-1&&bc===ac)return N;if(br===ar&&bc===ac+1)return E;if(br===ar+1&&bc===ac)return S;if(br===ar&&bc===ac-1)return W;return 0;}
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
  return{solutionLength:solution.length,turns,decisions,deadEnds,detour,score:solution.length+turns*6.2+decisions*12+deadEnds*1.8+detour*20};
}
export function generateMaze(difficulty='easy',seed='maze'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,candidates=[];
  for(let i=0;i<cfg.candidates;i++){const maze=generateCandidate(cfg.size,`${seed}:candidate:${i}`);candidates.push({...maze,complexity:mazeComplexity(maze)});}
  candidates.sort((a,b)=>a.complexity.score-b.complexity.score);const chosen=candidates[Math.min(candidates.length-1,Math.max(0,Math.round((candidates.length-1)*cfg.rank)))];
  return{...chosen,seed,difficulty};
}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const maze=generateMaze(difficulty,seed);let fullSolution=solveMaze(maze),player=maze.start,moves=0,trace=[maze.start],shownSolution=false,practice=false,complete=false,hintCells=[],destroyed=false,canvas,ctx,displaySize=560,drag=null,markerVisual=null;
  host.innerHTML='<div class="maze-stage"><canvas class="maze-canvas" aria-label="Maze board. Hold and drag, swipe, click adjacent cells, or use Arrow and WASD keys."></canvas></div>';
  canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');

  function pointFor(index,cell){const[r,c]=rcOf(index,maze.size);return[(c+.5)*cell,(r+.5)*cell];}
  function drawGuideLine(indices,cell,{hint=false}={}){if(!indices.length)return;const points=hint?[player,...indices]:indices;ctx.save();ctx.strokeStyle=hint?'rgba(55,217,154,.90)':'rgba(40,201,245,.66)';ctx.lineWidth=Math.max(3,cell*(hint?.14:.18));ctx.lineCap='round';ctx.lineJoin='round';if(hint)ctx.setLineDash([Math.max(4,cell*.22),Math.max(3,cell*.14)]);ctx.beginPath();points.forEach((idx,i)=>{const[x,y]=pointFor(idx,cell);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();ctx.restore();}
  function draw(){
    if(destroyed)return;const rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);displaySize=Math.max(260,Math.floor(rect.width||host.clientWidth||560));canvas.width=displaySize*ratio;canvas.height=displaySize*ratio;canvas.style.height=`${displaySize}px`;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,displaySize,displaySize);const cell=displaySize/maze.size;
    ctx.fillStyle='#0d1222';ctx.fillRect(0,0,displaySize,displaySize);if(shownSolution&&!complete)drawGuideLine(fullSolution,cell);if(hintCells.length&&!complete){drawGuideLine(hintCells,cell,{hint:true});const end=hintCells.at(-1),[x,y]=pointFor(end,cell);ctx.beginPath();ctx.fillStyle='#37d99a';ctx.arc(x,y,Math.max(3,cell*.10),0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#66708a';ctx.lineWidth=Math.max(1.4,cell*.07);ctx.beginPath();maze.walls.forEach((mask,idx)=>{const[r,c]=rcOf(idx,maze.size),x=c*cell,y=r*cell;if(mask&N){ctx.moveTo(x,y);ctx.lineTo(x+cell,y);}if(mask&W){ctx.moveTo(x,y);ctx.lineTo(x,y+cell);}if(r===maze.size-1&&mask&S){ctx.moveTo(x,y+cell);ctx.lineTo(x+cell,y+cell);}if(c===maze.size-1&&mask&E){ctx.moveTo(x+cell,y);ctx.lineTo(x+cell,y+cell);}});ctx.stroke();
    const marker=(idx,color,scale,visual=null)=>{const[x,y]=visual?[visual[0]*displaySize,visual[1]*displaySize]:pointFor(idx,cell);ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,Math.max(4,cell*scale),0,Math.PI*2);ctx.fill();};marker(maze.end,'#37d99a',.23);marker(player,'#7357ff',.27,markerVisual);
  }
  function canMoveBetween(from,to){const dir=directionBetween(from,to,maze.size);return Boolean(dir)&&!(maze.walls[from]&dir)&&!(maze.walls[to]&OPPOSITE[dir]);}
  function finish(){complete=true;drag=null;markerVisual=null;draw();if(practice){onStatus('Practice complete — you reached the finish using the guide.');onPracticeComplete('Maze practice complete. Reset to trace this maze again, or start a New Puzzle.');}else{onStatus('Maze complete.');onComplete();}}
  function moveTo(next,visual=null){if(complete||!canMoveBetween(player,next))return false;player=next;moves++;trace.push(next);hintCells=[];markerVisual=visual;onMetrics({moves});if(player===maze.end){finish();return true;}onStatus(shownSolution?'Practice: keep tracing the cyan route.':'Keep going. Find the green finish.');draw();return true;}
  function moveDirection(name){if(complete)return false;markerVisual=null;const[r,c]=rcOf(player,maze.size),target=name==='up'&&r>0?indexOf(r-1,c,maze.size):name==='right'&&c<maze.size-1?indexOf(r,c+1,maze.size):name==='down'&&r<maze.size-1?indexOf(r+1,c,maze.size):name==='left'&&c>0?indexOf(r,c-1,maze.size):-1;return target>=0?moveTo(target):false;}
  const keyHandler=e=>{if(complete)return;const map={ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left',w:'up',d:'right',s:'down',a:'left',W:'up',D:'right',S:'down',A:'left'},dir=map[e.key];if(!dir)return;e.preventDefault();moveDirection(dir);};window.addEventListener('keydown',keyHandler);

  function cellAt(clientX,clientY){const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return-1;const col=Math.min(maze.size-1,Math.floor(x/rect.width*maze.size)),row=Math.min(maze.size-1,Math.floor(y/rect.height*maze.size));return indexOf(row,col,maze.size);}
  function visualAt(clientX,clientY){const rect=canvas.getBoundingClientRect();return[Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(clientY-rect.top)/rect.height))];}
  function processPointerSample(clientX,clientY){if(!drag||complete)return;const target=cellAt(clientX,clientY);if(target<0)return;if(target===player){drag.blocked=false;markerVisual=visualAt(clientX,clientY);draw();return;}const dir=directionBetween(player,target,maze.size);if(!dir||drag.blocked)return;if(canMoveBetween(player,target)){moveTo(target,visualAt(clientX,clientY));drag.moved=true;}else{drag.blocked=true;onStatus(shownSolution?'A wall blocks that direction. Bring the marker back into the corridor, then follow the cyan route.':'Wall ahead. Drag back into the current corridor and choose an open turn.');}}
  function followPointer(clientX,clientY){if(!drag||complete)return;const fromX=drag.x,fromY=drag.y,dx=clientX-fromX,dy=clientY-fromY,distance=Math.hypot(dx,dy),rect=canvas.getBoundingClientRect(),sample=Math.max(1.5,Math.min(rect.width,rect.height)/maze.size*.07),steps=Math.max(1,Math.ceil(distance/sample));for(let i=1;i<=steps&&!complete;i++)processPointerSample(fromX+dx*i/steps,fromY+dy*i/steps);drag.x=clientX;drag.y=clientY;}
  canvas.addEventListener('pointerdown',e=>{if(complete)return;canvas.setPointerCapture?.(e.pointerId);drag={x:e.clientX,y:e.clientY,moved:false,blocked:false};markerVisual=null;processPointerSample(e.clientX,e.clientY);e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(!drag||complete)return;const events=e.getCoalescedEvents?.()||[e];for(const point of events)followPointer(point.clientX,point.clientY);e.preventDefault();});
  canvas.addEventListener('pointerup',e=>{if(!drag)return;followPointer(e.clientX,e.clientY);drag=null;markerVisual=null;draw();});canvas.addEventListener('pointercancel',()=>{drag=null;markerVisual=null;draw();});
  window.addEventListener('resize',draw);

  onMetrics({moves:0,hints:0,score:5000});onStatus('Reach the green finish. Hold and drag through open corridors; the marker follows your pointer and stops at walls.');requestAnimationFrame(draw);
  const timeDivisor=scoreTimeDivisor('maze',difficulty);
  return{
    supportsUndo:false,
    reset(){player=maze.start;moves=0;trace=[maze.start];hintCells=[];shownSolution=false;practice=false;complete=false;drag=null;markerVisual=null;onMetrics({moves:0});onStatus('Puzzle reset. Reach the green finish.');draw();},
    hint(){if(complete||shownSolution)return false;const path=solveMaze(maze,player,maze.end);hintCells=path.slice(1,4);if(!hintCells.length)return false;draw();const directions=[];let from=player;for(const next of hintCells){directions.push(directionLabel(from,next,maze.size));from=next;}onStatus(`Hint: follow the short green guide line — ${directions.join(' → ')}.`);setTimeout(()=>{if(!complete){hintCells=[];draw();}},4200);return true;},
    solution(){if(complete)return;practice=true;shownSolution=true;hintCells=[];fullSolution=solveMaze(maze,maze.start,maze.end);onStatus('Full route shown in cyan. Keep dragging through the corridors; walls still block movement.');draw();},
    hideSolution(){if(complete)return;shownSolution=false;hintCells=[];onStatus('Solution hidden. This attempt remains practice-only.');draw();},
    previewScore(timeMs,hints=0){const ideal=Math.max(1,fullSolution.length-1);return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-ideal)*14,hintPenalty:hints*180});},
    getResult(timeMs,hints=0){const ideal=Math.max(1,solveMaze(maze).length-1);return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-ideal)*14,hintPenalty:hints*180}),metadata:{moves,ideal_moves:ideal,size:maze.size,trace:[...trace]}};},
    destroy(){destroyed=true;window.removeEventListener('keydown',keyHandler);window.removeEventListener('resize',draw);}
  };
}
