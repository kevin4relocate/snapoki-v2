import {randomizedOpenPath,areAdjacent,directionLabel,scoreFromPerformance,scoreTimeDivisor} from './utils.js';

const LEVEL={easy:{size:5,openRatio:1,clueGap:3},medium:{size:6,openRatio:.89,clueGap:6},hard:{size:7,openRatio:.80,clueGap:9}};
export function generateNumberPath(difficulty='easy',seed='number-path'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,openCount=Math.max(8,Math.round(cfg.size*cfg.size*cfg.openRatio)),solution=randomizedOpenPath(cfg.size,openCount,seed),open=new Set(solution),blocked=[];
  for(let i=0;i<cfg.size*cfg.size;i++)if(!open.has(i))blocked.push(i);
  const cluePositions=[0];for(let i=cfg.clueGap;i<solution.length-1;i+=cfg.clueGap)cluePositions.push(i);if(cluePositions.at(-1)!==solution.length-1)cluePositions.push(solution.length-1);
  const clues=cluePositions.map((position,i)=>({index:solution[position],label:i+1,position}));return{size:cfg.size,solution,clues,blocked,openCount,seed,difficulty};
}
function badgeStyle(badge,{current=false,hint=false}={}){Object.assign(badge.style,{position:'absolute',right:hint?'auto':'5px',left:hint?'5px':'auto',top:hint?'auto':'5px',bottom:hint?'5px':'auto',minWidth:'21px',height:'21px',padding:'0 5px',borderRadius:'999px',display:'grid',placeItems:'center',fontSize:'9px',fontWeight:'900',lineHeight:'1',color:current?'#07111a':'#e8fbff',background:current?'#37d99a':hint?'rgba(55,217,154,.88)':'rgba(8,18,30,.90)',border:`1px solid ${hint?'rgba(55,217,154,.95)':'rgba(40,201,245,.75)'}`,boxShadow:current?'0 0 16px rgba(55,217,154,.45)':'0 2px 10px rgba(0,0,0,.28)',zIndex:'4',pointerEvents:'none'});}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete}){
  const puzzle=generateNumberPath(difficulty,seed),clueMap=new Map(puzzle.clues.map(c=>[c.index,c.label])),openSet=new Set(puzzle.solution),solutionStep=new Map(puzzle.solution.map((idx,i)=>[idx,i+1])),timeDivisor=scoreTimeDivisor('number-path',difficulty);
  let path=[puzzle.solution[0]],mistakes=0,dragging=false,lastPointer=null,hintGuide=[],solutionVisible=false;
  host.innerHTML=`<div class="number-grid" style="--grid-size:${puzzle.size}" aria-label="Number Path board"></div>`;const grid=host.querySelector('.number-grid');
  for(let index=0;index<puzzle.size*puzzle.size;index++){
    const b=document.createElement('button');b.type='button';b.className='number-cell';b.dataset.index=String(index);
    if(!openSet.has(index)){b.classList.add('blocked');b.disabled=true;b.setAttribute('aria-label','Blocked cell');}
    else{const clue=clueMap.get(index);if(clue){b.classList.add('checkpoint');b.style.setProperty('--checkpoint-color',`hsl(${(clue*67+205)%360} 82% 64%)`);b.innerHTML=`<span>${clue}</span>`;b.setAttribute('aria-label',`Checkpoint ${clue}`);}else b.setAttribute('aria-label','Open path cell');}
    grid.appendChild(b);
  }
  function nextExpectedLabel(){let highest=1;for(const index of path){const label=clueMap.get(index);if(label&&label===highest+1)highest=label;}return highest+1;}
  function prefixLength(){let i=0;while(i<path.length&&puzzle.solution[i]===path[i])i++;return i;}
  function pulseCell(index){const cell=grid.querySelector(`[data-index="${index}"]`);cell?.animate?.([{transform:'scale(.92)',filter:'brightness(1.35)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:180,easing:'ease-out'});}
  function render(){
    const pathSet=new Set(path),nextStep=path.length+1,hintMap=new Map(hintGuide.map((idx,i)=>[idx,i+1]));
    grid.querySelectorAll('.number-cell').forEach(cell=>{
      const idx=Number(cell.dataset.index),step=solutionStep.get(idx),hintOrder=hintMap.get(idx);cell.classList.toggle('in-path',pathSet.has(idx));cell.classList.toggle('path-head',path.at(-1)===idx);cell.classList.toggle('hinted',hintOrder!=null);cell.querySelectorAll('.solution-step-badge,.hint-step-badge').forEach(el=>el.remove());
      if(solutionVisible&&openSet.has(idx)){const badge=document.createElement('span');badge.className='solution-step-badge';badge.textContent=String(step);badgeStyle(badge,{current:step===nextStep});cell.appendChild(badge);}
      if(!solutionVisible&&hintOrder!=null){const badge=document.createElement('span');badge.className='hint-step-badge';badge.textContent=String(hintOrder);badgeStyle(badge,{current:hintOrder===1,hint:true});cell.appendChild(badge);}
    });
    onMetrics({cells:path.length,mistakes});
  }
  function addCell(index){
    if(!openSet.has(index))return false;const last=path.at(-1);if(index===last)return true;if(!areAdjacent(last,index,puzzle.size))return false;
    const existing=path.indexOf(index);if(existing>=0){if(existing===path.length-2){path.pop();hintGuide=[];render();return true;}return false;}
    const clue=clueMap.get(index),expected=nextExpectedLabel();if(clue&&clue!==expected){mistakes++;onMetrics({mistakes});onStatus(`Checkpoint ${clue} is too early. Reach checkpoint ${expected} first.`);return false;}
    path.push(index);hintGuide=[];render();pulseCell(index);
    if(path.length===puzzle.openCount){const finalLabel=puzzle.clues.at(-1).label;if(clueMap.get(index)===finalLabel){onStatus(solutionVisible?'Practice complete — you followed the guided route.':'Number Path complete.');onComplete();}else{mistakes++;onMetrics({mistakes});onStatus('All open cells are filled, but the final checkpoint must be last.');}}
    else onStatus(solutionVisible?`Practice: follow step ${path.length+1} next.`:`Filled ${path.length} of ${puzzle.openCount} open cells.`);return true;
  }
  function indexAt(clientX,clientY){const rect=grid.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return-1;const c=Math.min(puzzle.size-1,Math.floor(x/rect.width*puzzle.size)),r=Math.min(puzzle.size-1,Math.floor(y/rect.height*puzzle.size));return r*puzzle.size+c;}
  function dragThrough(clientX,clientY){if(!lastPointer){lastPointer=[clientX,clientY];const idx=indexAt(clientX,clientY);if(idx>=0)addCell(idx);return;}const [sx,sy]=lastPointer,dx=clientX-sx,dy=clientY-sy,rect=grid.getBoundingClientRect(),cellSize=rect.width/puzzle.size,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(4,cellSize*.18)));for(let i=1;i<=steps;i++){const idx=indexAt(sx+dx*i/steps,sy+dy*i/steps);if(idx>=0)addCell(idx);}lastPointer=[clientX,clientY];}
  grid.addEventListener('click',e=>{if(dragging)return;const cell=e.target.closest('.number-cell');if(cell)addCell(Number(cell.dataset.index));});
  grid.addEventListener('pointerdown',e=>{const idx=indexAt(e.clientX,e.clientY);if(idx<0||!openSet.has(idx))return;dragging=true;lastPointer=[e.clientX,e.clientY];grid.setPointerCapture?.(e.pointerId);addCell(idx);e.preventDefault();});
  grid.addEventListener('pointermove',e=>{if(!dragging)return;const events=e.getCoalescedEvents?.()||[e];for(const point of events)dragThrough(point.clientX,point.clientY);e.preventDefault();});
  const end=()=>{dragging=false;lastPointer=null;};grid.addEventListener('pointerup',end);grid.addEventListener('pointercancel',end);

  onMetrics({cells:1,mistakes:0,hints:0});onStatus(`Start at 1. Hold and drag through all ${puzzle.openCount} open cells; dark cells are blocked.`);render();
  return{
    supportsUndo:true,
    undo(){if(path.length<=1)return;path.pop();hintGuide=[];render();onStatus(solutionVisible?`Practice: backtracked. Follow step ${path.length+1} next.`:'Backtracked one cell.');},
    reset(){path=[puzzle.solution[0]];mistakes=0;hintGuide=[];solutionVisible=false;render();onStatus('Path reset. Start again at 1.');},
    hint(){if(solutionVisible)return false;const prefix=prefixLength();if(prefix<path.length){hintGuide=[path.at(-2)??path[0]];onStatus('Your route has diverged. Backtrack toward guide step 1.');}else if(path.length<puzzle.solution.length){hintGuide=puzzle.solution.slice(path.length,path.length+3);let from=path.at(-1);const dirs=[];for(const idx of hintGuide){dirs.push(directionLabel(from,idx,puzzle.size));from=idx;}onStatus(`Hint: follow the next ${hintGuide.length} guide step${hintGuide.length>1?'s':''} — ${dirs.join(' → ')}.`);}else return false;render();setTimeout(()=>{hintGuide=[];render();},4200);return true;},
    solution(){solutionVisible=true;hintGuide=[];render();onStatus(`Practice guide on: follow the numbered cells from 1 to ${puzzle.solution.length}. The green badge is your next step.`);},
    hideSolution(){solutionVisible=false;hintGuide=[];render();onStatus('Solution hidden. Continue practicing, or Reset Puzzle to make a new ranked attempt.');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:mistakes*180,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:mistakes*180,hintPenalty:hints*190}),metadata:{cells:path.length,open_cells:puzzle.openCount,blocked_cells:puzzle.blocked.length,mistakes,size:puzzle.size,path:[...path]}};},destroy(){}
  };
}
