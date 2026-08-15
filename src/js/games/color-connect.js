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
  let paths=new Map(),activeColor=null,redraws=0,hintedCells=new Set(),solutionVisible=false,practice=false,complete=false,drag=null,hintUses=0,solutionCursor=1;
  host.innerHTML=`<div class="color-board-wrap"><div class="color-grid" style="--grid-size:${puzzle.size}" aria-label="Color Connect board"></div><svg class="color-lines" viewBox="0 0 ${puzzle.size} ${puzzle.size}" aria-hidden="true"></svg></div>`;
  const grid=host.querySelector('.color-grid'),svg=host.querySelector('.color-lines'),ns='http://www.w3.org/2000/svg';
  for(let index=0;index<puzzle.size*puzzle.size;index++){
    const cell=document.createElement('button');cell.type='button';cell.className='color-cell';cell.dataset.index=String(index);
    if(blocked.has(index)){cell.classList.add('blocked');cell.disabled=true;cell.setAttribute('aria-label','Blocked cell');}
    else{const colorIndex=endpoint.get(index);if(colorIndex!=null){cell.classList.add('color-endpoint');cell.style.setProperty('--cell-color',puzzle.segments[colorIndex].color);cell.setAttribute('aria-label',`${puzzle.segments[colorIndex].name} endpoint`);}else cell.setAttribute('aria-label','Open color path cell');}
    grid.appendChild(cell);
  }
  function ownerMap(){const owners=new Map();for(const[color,path]of paths)for(const idx of path)owners.set(idx,color);return owners;}
  function isConnected(segment,color){const path=paths.get(color)||[];return path.length>1&&((path[0]===segment.start&&path.at(-1)===segment.end)||(path[0]===segment.end&&path.at(-1)===segment.start));}
  function connectedColors(){const set=new Set();puzzle.segments.forEach((segment,color)=>{if(isConnected(segment,color))set.add(color);});return set;}
  function connectedCount(){return connectedColors().size;}
  function addLine(path,color,className){if(path.length<2)return;const line=document.createElementNS(ns,'polyline');line.setAttribute('points',polylinePoints(path,puzzle.size));line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('class',className);line.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(line);}
  function renderLines(){svg.replaceChildren();if(solutionVisible)puzzle.segments.forEach((segment,i)=>addLine(segment.path,segment.color,`color-solution-line${i===solutionCursor-1?' solution-current':''}`));for(const[color,path]of paths)addLine(path,puzzle.segments[color].color,'color-player-line');}
  function render(){const owners=ownerMap(),connected=connectedColors();grid.querySelectorAll('.color-cell').forEach(cell=>{const idx=Number(cell.dataset.index),color=owners.get(idx),endpointColor=endpoint.get(idx);cell.classList.toggle('filled',color!=null);cell.classList.toggle('hinted',hintedCells.has(idx));cell.classList.toggle('paired',endpointColor!=null&&connected.has(endpointColor));if(color!=null)cell.style.setProperty('--path-color',puzzle.segments[color].color);else cell.style.removeProperty('--path-color');});renderLines();onMetrics({paths:connected.size,redraws});}
  function finish(){complete=true;drag=null;activeColor=null;host.classList.add('game-solved-bloom');render();if(practice){onStatus('Practice complete — every guided color route is connected.');onPracticeComplete('Color Connect practice complete. Reset to trace this board again, or start a New Puzzle.');}else{onStatus('Color Connect complete.');onComplete();}}
  function checkComplete(){if(complete)return true;const allConnected=connectedCount()===puzzle.segments.length,covered=ownerMap().size===puzzle.openCount;if(allConnected&&covered){finish();return true;}onStatus(solutionVisible?`${connectedCount()} of ${puzzle.segments.length} pairs complete. Trace the translucent guide lines.`:`${connectedCount()} of ${puzzle.segments.length} color pairs connected.`);return false;}
  function beginPath(color,index,replace=true){if(complete)return;const existing=paths.get(color)||[];if(replace&&existing.length>1)redraws++;paths.set(color,[index]);activeColor=color;render();}
  function addCell(index){
    if(complete||blocked.has(index)||activeColor==null)return false;const path=paths.get(activeColor)||[],last=path.at(-1);if(index===last)return true;if(!areAdjacent(last,index,puzzle.size))return false;
    const ownIndex=path.indexOf(index);if(ownIndex>=0){if(ownIndex===path.length-2){path.pop();render();return true;}return false;}
    const endpointColor=endpoint.get(index);if(endpointColor!=null&&endpointColor!==activeColor)return false;const occupiedBy=ownerMap().get(index);if(occupiedBy!=null&&occupiedBy!==activeColor)return false;
    const completingColor=activeColor;path.push(index);paths.set(activeColor,path);const segment=puzzle.segments[activeColor];if((index===segment.start||index===segment.end)&&path.length>1)activeColor=null;render();grid.querySelector(`[data-index="${index}"]`)?.animate?.([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:130,easing:'ease-out'});if(activeColor==null&&isConnected(segment,completingColor)){for(const endpointIndex of[segment.start,segment.end])grid.querySelector(`[data-index="${endpointIndex}"]`)?.animate?.([{transform:'scale(.88)',filter:'brightness(1.7)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:360,easing:'ease-out'});}checkComplete();return true;
  }
  function indexAt(clientX,clientY){const rect=grid.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return-1;const c=Math.min(puzzle.size-1,Math.floor(x/rect.width*puzzle.size)),r=Math.min(puzzle.size-1,Math.floor(y/rect.height*puzzle.size));return r*puzzle.size+c;}
  function colorAtStart(index){const ep=endpoint.get(index);if(ep!=null)return ep;const owners=ownerMap(),color=owners.get(index);if(color==null)return null;const path=paths.get(color)||[];return index===path.at(-1)||index===path[0]?color:null;}
  function intendedNeighbor(clientX,clientY){
    if(!drag)return-1;const rect=grid.getBoundingClientRect(),cellW=rect.width/puzzle.size,cellH=rect.height/puzzle.size,current=drag.started?(paths.get(drag.color)||[]).at(-1):drag.start;if(current==null)return-1;const[r,c]=rcOf(current,puzzle.size),cx=rect.left+(c+.5)*cellW,cy=rect.top+(r+.5)*cellH,dx=(clientX-cx)/cellW,dy=(clientY-cy)/cellH,ax=Math.abs(dx),ay=Math.abs(dy),threshold=.36,dominance=1.12;let nr=r,nc=c;if(ax>=threshold&&ax>=ay*dominance)nc+=dx>0?1:-1;else if(ay>=threshold&&ay>=ax*dominance)nr+=dy>0?1:-1;else return-1;if(nr<0||nc<0||nr>=puzzle.size||nc>=puzzle.size)return-1;return nr*puzzle.size+nc;
  }
  function dragIntent(clientX,clientY){if(!drag||complete)return;for(let guard=0;guard<puzzle.size*2;guard++){const idx=intendedNeighbor(clientX,clientY);if(idx<0||blocked.has(idx))break;if(!drag.started){beginPath(drag.color,drag.start,true);drag.started=true;}const before=(paths.get(drag.color)||[]).at(-1);if(!addCell(idx))break;const after=(paths.get(drag.color)||[]).at(-1);if(after===before||activeColor==null)break;}}
  grid.addEventListener('pointerdown',e=>{if(complete)return;const idx=indexAt(e.clientX,e.clientY),color=colorAtStart(idx);if(idx<0||color==null||blocked.has(idx))return;drag={start:idx,color,started:false};grid.setPointerCapture?.(e.pointerId);e.preventDefault();});
  grid.addEventListener('pointermove',e=>{if(!drag||complete)return;const events=e.getCoalescedEvents?.()||[e];for(const point of events)dragIntent(point.clientX,point.clientY);e.preventDefault();});
  const stop=()=>{if(drag?.started&&!complete)checkComplete();drag=null;activeColor=null;};grid.addEventListener('pointerup',stop);grid.addEventListener('pointercancel',stop);

  onMetrics({paths:0,redraws:0,hints:0});onStatus(`Drag from one colored endpoint to its match and cover all ${puzzle.openCount} open cells. Patterned cells are blocked.`);render();
  return{
    supportsUndo:false,
    reset(){host.classList.remove('game-solved-bloom');paths=new Map();activeColor=null;redraws=0;hintedCells=new Set();solutionVisible=false;practice=false;complete=false;drag=null;hintUses=0;solutionCursor=1;render();onStatus('Board reset. Connect every color pair.');},
    hint(){if(complete||solutionVisible)return false;hintUses++;let color=puzzle.segments.findIndex((segment,i)=>!isConnected(segment,i));if(color<0)return false;const segment=puzzle.segments[color],current=paths.get(color)||[];let guide=segment.path;if(current[0]===segment.end)guide=[...segment.path].reverse();const prefixOk=current.every((idx,i)=>guide[i]===idx),reveal=Math.min(3,hintUses);if(!prefixOk&&current.length){hintedCells=new Set([current.at(-1),current.at(-2)].filter(v=>v!=null));onStatus(`Hint ${hintUses}: the ${segment.name} route has diverged. Backtrack toward the highlighted cells.`);}else{const startAt=current.length||0;hintedCells=new Set(guide.slice(startAt,startAt+reveal));onStatus(hintUses===1?`Hint 1: focus on the highlighted next cell for the ${segment.name} pair.`:`Hint ${hintUses}: trace the ${segment.name} path through the next ${reveal} highlighted cells.`);}render();setTimeout(()=>{if(!complete){hintedCells=new Set();render();}},4200);return true;},
    solution(){if(complete)return;practice=true;solutionVisible=true;hintedCells=new Set();solutionCursor=Math.max(1,Math.min(puzzle.segments.length,solutionCursor));render();onStatus(`Practice guide on: focus on ${puzzle.segments[solutionCursor-1].name}, then use Previous/Next to inspect each route.`);},
    solutionStep(delta=0){if(!solutionVisible||complete)return null;solutionCursor=Math.max(1,Math.min(puzzle.segments.length,solutionCursor+delta));render();const segment=puzzle.segments[solutionCursor-1];onStatus(`Practice guide: ${segment.name} route (${solutionCursor}/${puzzle.segments.length}).`);return{current:solutionCursor,total:puzzle.segments.length,label:segment.name};},
    hideSolution(){if(complete)return;solutionVisible=false;hintedCells=new Set();render();onStatus('Solution hidden. This attempt remains practice-only.');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:redraws*80,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){const routes=[...paths.entries()].map(([color,path])=>({color,path:[...path]}));return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:redraws*80,hintPenalty:hints*190}),metadata:{redraws,paths:connectedCount(),open_cells:puzzle.openCount,blocked_cells:puzzle.blocked.length,size:puzzle.size,routes}};},destroy(){}
  };
}
