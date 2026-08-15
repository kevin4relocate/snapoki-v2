import {selectScatteredOpenPath,areAdjacent,rngFromSeed,rcOf,scoreFromPerformance,scoreTimeDivisor} from './utils.js';

const LEVEL={easy:{size:5,colors:4,openRatio:1},medium:{size:6,colors:5,openRatio:.86},hard:{size:7,colors:7,openRatio:.76}};
const COLORS=['#ff5d8f','#52d273','#5ca8ff','#ffb347','#b879ff','#39d0d8','#ff7c54','#e7e25a'];
const NAMES=['pink','green','blue','orange','purple','cyan','coral','yellow'];
export function generateColorConnect(difficulty='easy',seed='color-connect'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,openCount=Math.max(cfg.colors*3,Math.round(cfg.size*cfg.size*cfg.openRatio)),solution=selectScatteredOpenPath(cfg.size,openCount,`${seed}:route`,difficulty==='hard'?16:12),open=new Set(solution),blocked=[];
  for(let i=0;i<cfg.size*cfg.size;i++)if(!open.has(i))blocked.push(i);
  const rng=rngFromSeed(`${seed}:segments`),lengths=Array(cfg.colors).fill(3);let remaining=solution.length-3*cfg.colors;while(remaining-->0)lengths[Math.floor(rng()*cfg.colors)]++;
  const segments=[];let cursor=0;for(let i=0;i<cfg.colors;i++){const path=solution.slice(cursor,cursor+lengths[i]);cursor+=lengths[i];segments.push({color:COLORS[i],name:NAMES[i],path,start:path[0],end:path.at(-1)});}return{size:cfg.size,segments,blocked,openCount,seed,difficulty};
}
function polylinePoints(path,size){return path.map(index=>{const[r,c]=rcOf(index,size);return `${c+.5},${r+.5}`;}).join(' ');}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateColorConnect(difficulty,seed),endpoint=new Map(),blocked=new Set(puzzle.blocked),timeDivisor=scoreTimeDivisor('color-connect',difficulty);puzzle.segments.forEach((s,i)=>{endpoint.set(s.start,i);endpoint.set(s.end,i);});
  let paths=new Map(),activeColor=null,redraws=0,hintedCells=new Set(),solutionVisible=false,practice=false,complete=false,drag=null,lastPointer=null;
  host.innerHTML=`<div class="color-board-wrap"><div class="color-grid" style="--grid-size:${puzzle.size}" aria-label="Color Connect board"></div><svg class="color-lines" viewBox="0 0 ${puzzle.size} ${puzzle.size}" aria-hidden="true"></svg></div>`;
  const grid=host.querySelector('.color-grid'),svg=host.querySelector('.color-lines'),ns='http://www.w3.org/2000/svg';
  for(let index=0;index<puzzle.size*puzzle.size;index++){
    const cell=document.createElement('button');cell.type='button';cell.className='color-cell';cell.dataset.index=String(index);
    if(blocked.has(index)){cell.classList.add('blocked');cell.disabled=true;cell.setAttribute('aria-label','Blocked cell');}
    else{const colorIndex=endpoint.get(index);if(colorIndex!=null){cell.classList.add('color-endpoint');cell.style.setProperty('--cell-color',puzzle.segments[colorIndex].color);cell.setAttribute('aria-label',`${puzzle.segments[colorIndex].name} endpoint`);}else cell.setAttribute('aria-label','Open color path cell');}
    grid.appendChild(cell);
  }
  function ownerMap(){const owners=new Map();for(const[color,path]of paths)for(const idx of path)owners.set(idx,color);return owners;}
  function connectedCount(){let count=0;puzzle.segments.forEach((segment,color)=>{const path=paths.get(color)||[];if(path.length>1&&((path[0]===segment.start&&path.at(-1)===segment.end)||(path[0]===segment.end&&path.at(-1)===segment.start)))count++;});return count;}
  function addLine(path,color,className){if(path.length<2)return;const line=document.createElementNS(ns,'polyline');line.setAttribute('points',polylinePoints(path,puzzle.size));line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('class',className);line.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(line);}
  function renderLines(){svg.replaceChildren();if(solutionVisible)for(const segment of puzzle.segments)addLine(segment.path,segment.color,'color-solution-line');for(const[color,path]of paths)addLine(path,puzzle.segments[color].color,'color-player-line');}
  function render(){const owners=ownerMap();grid.querySelectorAll('.color-cell').forEach(cell=>{const idx=Number(cell.dataset.index),color=owners.get(idx);cell.classList.toggle('filled',color!=null);cell.classList.toggle('hinted',hintedCells.has(idx));if(color!=null)cell.style.setProperty('--path-color',puzzle.segments[color].color);else cell.style.removeProperty('--path-color');});renderLines();onMetrics({paths:connectedCount(),redraws});}
  function finish(){complete=true;drag=null;lastPointer=null;activeColor=null;render();if(practice){onStatus('Practice complete — every guided color route is connected.');onPracticeComplete('Color Connect practice complete. Reset to trace this board again, or start a New Puzzle.');}else{onStatus('Color Connect complete.');onComplete();}}
  function checkComplete(){if(complete)return true;const allConnected=connectedCount()===puzzle.segments.length,covered=ownerMap().size===puzzle.openCount;if(allConnected&&covered){finish();return true;}onStatus(solutionVisible?`${connectedCount()} of ${puzzle.segments.length} pairs complete. Trace the translucent guide lines.`:`${connectedCount()} of ${puzzle.segments.length} color pairs connected.`);return false;}
  function beginPath(color,index,replace=true){if(complete)return;const existing=paths.get(color)||[];if(replace&&existing.length>1)redraws++;paths.set(color,[index]);activeColor=color;render();}
  function addCell(index){
    if(complete||blocked.has(index)||activeColor==null)return false;const path=paths.get(activeColor)||[],last=path.at(-1);if(index===last)return true;if(!areAdjacent(last,index,puzzle.size))return false;
    const ownIndex=path.indexOf(index);if(ownIndex>=0){if(ownIndex===path.length-2){path.pop();render();return true;}return false;}
    const endpointColor=endpoint.get(index);if(endpointColor!=null&&endpointColor!==activeColor)return false;const occupiedBy=ownerMap().get(index);if(occupiedBy!=null&&occupiedBy!==activeColor)return false;
    path.push(index);paths.set(activeColor,path);const segment=puzzle.segments[activeColor];if((index===segment.start||index===segment.end)&&path.length>1)activeColor=null;render();grid.querySelector(`[data-index="${index}"]`)?.animate?.([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:130,easing:'ease-out'});checkComplete();return true;
  }
  function indexAt(clientX,clientY){const rect=grid.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return-1;const c=Math.min(puzzle.size-1,Math.floor(x/rect.width*puzzle.size)),r=Math.min(puzzle.size-1,Math.floor(y/rect.height*puzzle.size));return r*puzzle.size+c;}
  function colorAtStart(index){const ep=endpoint.get(index);if(ep!=null)return ep;const owners=ownerMap(),color=owners.get(index);if(color==null)return null;const path=paths.get(color)||[];return index===path.at(-1)||index===path[0]?color:null;}
  function startDragIfNeeded(nextIndex){if(!drag||drag.started||nextIndex===drag.start||!areAdjacent(drag.start,nextIndex,puzzle.size))return;beginPath(drag.color,drag.start,true);drag.started=true;addCell(nextIndex);}
  function dragThrough(clientX,clientY){if(!drag||!lastPointer||complete)return;const[sx,sy]=lastPointer,dx=clientX-sx,dy=clientY-sy,rect=grid.getBoundingClientRect(),cellSize=rect.width/puzzle.size,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(3,cellSize*.12)));for(let i=1;i<=steps;i++){const idx=indexAt(sx+dx*i/steps,sy+dy*i/steps);if(idx<0||blocked.has(idx))continue;if(!drag.started)startDragIfNeeded(idx);else addCell(idx);}lastPointer=[clientX,clientY];}
  grid.addEventListener('pointerdown',e=>{if(complete)return;const idx=indexAt(e.clientX,e.clientY),color=colorAtStart(idx);if(idx<0||color==null||blocked.has(idx))return;drag={start:idx,color,started:false};lastPointer=[e.clientX,e.clientY];grid.setPointerCapture?.(e.pointerId);e.preventDefault();});
  grid.addEventListener('pointermove',e=>{if(!drag||complete)return;const events=e.getCoalescedEvents?.()||[e];for(const point of events)dragThrough(point.clientX,point.clientY);e.preventDefault();});
  const stop=()=>{if(drag?.started&&!complete)checkComplete();drag=null;lastPointer=null;activeColor=null;};grid.addEventListener('pointerup',stop);grid.addEventListener('pointercancel',stop);

  onMetrics({paths:0,redraws:0,hints:0});onStatus(`Drag from one colored endpoint to its match and cover all ${puzzle.openCount} open cells. Patterned cells are blocked.`);render();
  return{
    supportsUndo:false,
    reset(){paths=new Map();activeColor=null;redraws=0;hintedCells=new Set();solutionVisible=false;practice=false;complete=false;drag=null;lastPointer=null;render();onStatus('Board reset. Connect every color pair.');},
    hint(){if(complete||solutionVisible)return false;let color=puzzle.segments.findIndex((segment,i)=>{const path=paths.get(i)||[];return !(path.length>1&&((path[0]===segment.start&&path.at(-1)===segment.end)||(path[0]===segment.end&&path.at(-1)===segment.start)));});if(color<0)return false;const segment=puzzle.segments[color],current=paths.get(color)||[];let guide=segment.path;if(current[0]===segment.end)guide=[...segment.path].reverse();const prefixOk=current.every((idx,i)=>guide[i]===idx);if(!prefixOk&&current.length){hintedCells=new Set([current.at(-1),current.at(-2)].filter(v=>v!=null));onStatus(`${segment.name} path has diverged. Backtrack toward the highlighted cells.`);}else{const startAt=current.length||0;hintedCells=new Set(guide.slice(startAt,startAt+3));onStatus(`Hint: trace the ${segment.name} path through the next highlighted cells.`);}render();setTimeout(()=>{if(!complete){hintedCells=new Set();render();}},4200);return true;},
    solution(){if(complete)return;practice=true;solutionVisible=true;hintedCells=new Set();render();onStatus('Practice guide on: drag each color along its translucent line. Your own paths remain bright and persist after release.');},
    hideSolution(){if(complete)return;solutionVisible=false;hintedCells=new Set();render();onStatus('Solution hidden. This attempt remains practice-only.');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:redraws*80,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){const routes=[...paths.entries()].map(([color,path])=>({color,path:[...path]}));return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:redraws*80,hintPenalty:hints*190}),metadata:{redraws,paths:connectedCount(),open_cells:puzzle.openCount,blocked_cells:puzzle.blocked.length,size:puzzle.size,routes}};},destroy(){}
  };
}
