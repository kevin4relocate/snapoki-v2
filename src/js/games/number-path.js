import {deterministicHamiltonianPath,blockedLayoutStats,openRegionStats,rngFromSeed,areAdjacent,directionLabel,scoreFromPerformance,scoreTimeDivisor,orthogonalNeighbors} from './utils.js';

const LEVEL={
  easy:{size:6,blockedCount:0,clueCount:8,candidates:16,flips:18},
  medium:{size:8,blockedCount:14,clueCount:7,candidates:64,flips:0},
  hard:{size:10,blockedCount:34,clueCount:6,candidates:72,flips:0}
};

function blockClusterStats(blocked,size){
  const set=new Set(blocked),seen=new Set(),sizes=[];
  for(const index of set){
    if(seen.has(index))continue;
    let count=0,queue=[index];seen.add(index);
    while(queue.length){
      const current=queue.shift();count++;
      for(const next of orthogonalNeighbors(current,size,size))if(set.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
    }
    sizes.push(count);
  }
  sizes.sort((a,b)=>b-a);
  return{
    clusterCount:sizes.length,
    clusterSizes:sizes,
    majorClusters:sizes.filter(value=>value>=3).length,
    tacticalGroups:sizes.filter(value=>value>=2&&value<=6).length,
    singles:sizes.filter(value=>value===1).length,
    dominoes:sizes.filter(value=>value===2).length
  };
}

function directionCode(a,b,size){
  const ar=Math.floor(a/size),ac=a%size,br=Math.floor(b/size),bc=b%size;
  return br<ar?'u':br>ar?'d':bc<ac?'l':'r';
}

function pathShape(path,size){
  let longestStraight=0,straight=0,last='',runs=[];
  for(let i=1;i<path.length;i++){
    const dir=directionCode(path[i-1],path[i],size);
    if(last===dir)straight++;
    else{if(straight)runs.push(straight);straight=1;last=dir;}
    longestStraight=Math.max(longestStraight,straight);
  }
  if(straight)runs.push(straight);
  return{
    longestStraight,
    straightRuns:runs.length,
    shortRuns:runs.filter(value=>value<=2).length,
    avgStraight:runs.length?runs.reduce((a,b)=>a+b,0)/runs.length:0
  };
}

function randomizeHamiltonianPath(base,size,seed,flips){
  const rng=rngFromSeed(`${seed}:route-flips`),path=[...base];
  for(let round=0;round<flips;round++){
    const options=[];
    for(let i=0;i<path.length-3;i++)for(let j=i+2;j<path.length-1;j++)if(areAdjacent(path[i],path[j],size)&&areAdjacent(path[i+1],path[j+1],size))options.push([i,j]);
    if(!options.length)break;
    const[i,j]=options[Math.floor(rng()*options.length)],middle=path.slice(i+1,j+1).reverse();
    path.splice(i+1,middle.length,...middle);
  }
  return path;
}

function greedyTacticalRoute(size,targetCount,seed,difficulty){
  const total=size*size,attempts=difficulty==='hard'?18:14;
  let best=[];
  for(let attempt=0;attempt<attempts;attempt++){
    const rng=rngFromSeed(`${seed}:walk:${attempt}`),start=Math.floor(rng()*total),path=[start],used=new Set(path);
    let lastDir='',straightRun=0;
    while(path.length<targetCount){
      const current=path.at(-1),available=orthogonalNeighbors(current,size,size).filter(next=>!used.has(next));
      if(!available.length)break;
      const ranked=available.map(next=>{
        const onward=orthogonalNeighbors(next,size,size).filter(node=>!used.has(node)&&node!==current).length,
          dir=directionCode(current,next,size),turn=Boolean(lastDir&&dir!==lastDir),futureRun=dir===lastDir?straightRun+1:1,
          sideTouches=orthogonalNeighbors(next,size,size).filter(node=>used.has(node)&&node!==current).length,
          [row,col]=[Math.floor(next/size),next%size],edge=row===0||col===0||row===size-1||col===size-1,
          turnWeight=difficulty==='hard'?10:8,runPenalty=difficulty==='hard'?5.5:4.2,
          score=onward*6+(turn?turnWeight:0)+sideTouches*1.55-(Math.max(0,futureRun-2)*runPenalty)-(edge?0.35:0)+rng()*2.8;
        return{next,dir,futureRun,onward,score};
      }).sort((a,b)=>b.score-a.score);
      let chosen=ranked[0];
      if(path.length+1<targetCount&&chosen.onward===0){const alternate=ranked.find(item=>item.onward>0);if(alternate)chosen=alternate;}
      path.push(chosen.next);used.add(chosen.next);lastDir=chosen.dir;straightRun=chosen.futureRun;
    }
    if(path.length>best.length)best=path;
    if(path.length===targetCount)return path;
  }
  if(best.length>=targetCount)return best.slice(0,targetCount);
  return deterministicHamiltonianPath(size,`${seed}:emergency`).slice(0,targetCount);
}

function blockerTurnPressure(solution,blocked,size){
  const blockSet=new Set(blocked);let turnsNearBlocks=0;
  for(let i=1;i<solution.length-1;i++){
    if(directionCode(solution[i-1],solution[i],size)===directionCode(solution[i],solution[i+1],size))continue;
    if(orthogonalNeighbors(solution[i],size,size).some(next=>blockSet.has(next)))turnsNearBlocks++;
  }
  return turnsNearBlocks;
}

function layoutGate(blocks,clusters,blockedCount,difficulty){
  if(!blockedCount)return true;
  if(difficulty==='medium')return blocks.largestCluster<=Math.max(6,Math.ceil(blockedCount*.50))&&blocks.quadrants>=3&&blocks.rowSpread>=4&&blocks.colSpread>=4&&blocks.isolated>=3&&clusters.clusterCount>=6&&clusters.majorClusters>=2&&clusters.tacticalGroups>=2;
  return blocks.largestCluster<=Math.max(12,Math.ceil(blockedCount*.45))&&blocks.quadrants>=4&&blocks.rowSpread>=6&&blocks.colSpread>=6&&blocks.isolated>=4&&clusters.clusterCount>=8&&clusters.majorClusters>=3&&clusters.tacticalGroups>=3;
}

function routeGate(graph,shape,blockerTurns,difficulty){
  if(difficulty==='easy')return graph.turns>=8&&shape.longestStraight<=5;
  if(difficulty==='medium')return graph.turns>=22&&shape.longestStraight<=6&&blockerTurns>=17&&graph.ambiguousSteps>=10;
  return graph.turns>=36&&shape.longestStraight<=6&&blockerTurns>=30&&graph.ambiguousSteps>=11;
}

function assessCandidate(cfg,solution,blocked,difficulty){
  const blocks=blockedLayoutStats(blocked,cfg.size),clusters=blockClusterStats(blocked,cfg.size),graph=openRegionStats(solution,cfg.size,solution),shape=pathShape(solution,cfg.size),blockerTurns=blockerTurnPressure(solution,blocked,cfg.size),layoutValid=layoutGate(blocks,clusters,blocked.length,difficulty),routeValid=routeGate(graph,shape,blockerTurns,difficulty),tacticalValid=layoutValid&&routeValid;
  const score=graph.ambiguousSteps*24+graph.branchCells*9+graph.chokepoints*14+graph.turns*13+blockerTurns*22+shape.shortRuns*6+blocks.quadrants*30+(blocks.rowSpread+blocks.colSpread)*8+Math.min(blocks.isolated,8)*26+clusters.clusterCount*34+clusters.majorClusters*62+clusters.tacticalGroups*48-blocks.largestCluster*19-blocks.adjacentPairs*2-shape.longestStraight*78-shape.avgStraight*18-(tacticalValid?0:18000);
  return{solution,blocked,openCount:solution.length,quality:{...graph,...shape,blocks,clusters,blockerTurns,layoutValid,routeValid,tacticalValid,score}};
}

function candidateFor(cfg,seed,index,difficulty){
  if(difficulty==='easy'){
    const base=deterministicHamiltonianPath(cfg.size,`${seed}:easy:${index}`),solution=randomizeHamiltonianPath(base,cfg.size,`${seed}:easy:${index}`,cfg.flips);
    return assessCandidate(cfg,solution,[],difficulty);
  }
  const openCount=cfg.size*cfg.size-cfg.blockedCount,solution=greedyTacticalRoute(cfg.size,openCount,`${seed}:candidate:${index}`,difficulty),open=new Set(solution),blocked=[];
  for(let node=0;node<cfg.size*cfg.size;node++)if(!open.has(node))blocked.push(node);
  return assessCandidate(cfg,solution,blocked,difficulty);
}

function checkpointPressure(solution,position,size,open){
  let localTurns=0;
  for(let i=Math.max(1,position-2);i<=Math.min(solution.length-2,position+2);i++)if(directionCode(solution[i-1],solution[i],size)!==directionCode(solution[i],solution[i+1],size))localTurns++;
  const cell=solution[position],degree=orthogonalNeighbors(cell,size,size).filter(next=>open.has(next)).length;
  return localTurns*7+Math.max(0,degree-2)*8;
}

function chooseClues(solution,count,seed,size){
  const rng=rngFromSeed(`${seed}:clues:v5`),last=solution.length-1,positions=[0],open=new Set(solution);
  for(let i=1;i<count-1;i++){
    const ideal=Math.round(i*last/(count-1)),window=Math.max(2,Math.floor(last/(count-1)*.38)),min=positions.at(-1)+2,max=Math.max(min,Math.min(last-(count-1-i)*2,ideal+window)),low=Math.min(max,Math.max(min,ideal-window));
    let best=low,bestScore=-Infinity;
    for(let pos=low;pos<=max;pos++){
      const score=checkpointPressure(solution,pos,size,open)-Math.abs(pos-ideal)*.35+rng()*2;
      if(score>bestScore){bestScore=score;best=pos;}
    }
    positions.push(best);
  }
  positions.push(last);
  return positions.map(position=>({index:solution[position],label:position+1,position}));
}

export function numberPathComplexity(puzzle){return puzzle.quality||openRegionStats(puzzle.solution,puzzle.size,puzzle.solution);}

export function generateNumberPath(difficulty='easy',seed='number-path'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,candidates=[];let bestFallback=null;
  const primary=cfg.candidates,max=difficulty==='easy'?primary:primary*4;
  for(let i=0;i<max;i++){
    const candidate=candidateFor(cfg,seed,i,difficulty);
    if(!bestFallback||candidate.quality.score>bestFallback.quality.score)bestFallback=candidate;
    if(difficulty==='easy'||candidate.quality.tacticalValid)candidates.push(candidate);
    if(i+1>=primary&&(difficulty==='easy'||candidates.length>=Math.max(4,Math.floor(primary*.08))))break;
  }
  const pool=candidates.length?candidates:[bestFallback],chosen=pool.sort((a,b)=>b.quality.score-a.quality.score)[0],clues=chooseClues(chosen.solution,cfg.clueCount,seed,cfg.size);
  return{size:cfg.size,solution:chosen.solution,clues,blocked:chosen.blocked,openCount:chosen.openCount,quality:chosen.quality,seed,difficulty};
}

function badgeStyle(badge,{current=false,hint=false}={}){Object.assign(badge.style,{position:'absolute',right:hint?'auto':'5px',left:hint?'5px':'auto',top:hint?'auto':'5px',bottom:hint?'5px':'auto',minWidth:'21px',height:'21px',padding:'0 5px',borderRadius:'999px',display:'grid',placeItems:'center',fontSize:'9px',fontWeight:'900',lineHeight:'1',color:current?'#07111a':'#e8fbff',background:current?'#d8f8ff':hint?'rgba(55,217,154,.88)':'rgba(8,18,30,.90)',border:`1px solid ${hint?'rgba(55,217,154,.95)':'rgba(40,201,245,.75)'}`,boxShadow:current?'0 0 16px rgba(40,201,245,.38)':'0 2px 10px rgba(0,0,0,.28)',zIndex:'4',pointerEvents:'none'});}

function routePoints(path,size){return path.map(index=>`${index%size+.5},${Math.floor(index/size)+.5}`).join(' ');}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateNumberPath(difficulty,seed),clueMap=new Map(puzzle.clues.map(c=>[c.index,c.label])),requiredAtStep=new Map(puzzle.clues.map(c=>[c.label,c.index])),openSet=new Set(puzzle.solution),solutionStep=new Map(puzzle.solution.map((idx,i)=>[idx,i+1])),timeDivisor=scoreTimeDivisor('number-path',difficulty);
  let path=[puzzle.solution[0]],mistakes=0,dragging=false,lastPointer=null,hintGuide=[],solutionVisible=false,practice=false,complete=false,hintUses=0,solutionCursor=1,conflictKeys=new Set();
  host.innerHTML=`<div class="number-board-wrap" style="position:relative;width:min(100%,560px);aspect-ratio:1"><div class="number-grid" style="--grid-size:${puzzle.size};width:100%;height:100%" aria-label="Number Path board"></div><svg class="number-solution-guide" viewBox="0 0 ${puzzle.size} ${puzzle.size}" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;overflow:visible"></svg></div>`;const grid=host.querySelector('.number-grid'),guideSvg=host.querySelector('.number-solution-guide'),ns='http://www.w3.org/2000/svg';
  for(let index=0;index<puzzle.size*puzzle.size;index++){const b=document.createElement('button');b.type='button';b.className='number-cell';b.dataset.index=String(index);if(!openSet.has(index)){b.classList.add('blocked');b.disabled=true;b.setAttribute('aria-label','Blocked cell');}else{const clue=clueMap.get(index);if(clue){b.classList.add('checkpoint');b.style.setProperty('--checkpoint-color',`hsl(${(clue*41+205)%360} 76% 65%)`);b.innerHTML=`<span>${clue}</span>`;b.setAttribute('aria-label',`Step checkpoint ${clue}`);}else b.setAttribute('aria-label','Open path cell');}grid.appendChild(b);}
  function prefixLength(){let i=0;while(i<path.length&&puzzle.solution[i]===path[i])i++;return i;}
  function pulseCell(index){const cell=grid.querySelector(`[data-index="${index}"]`);cell?.animate?.([{transform:'scale(.94)',filter:'brightness(1.18)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:180,easing:'ease-out'});}
  function nextCheckpoint(){return puzzle.clues.find(clue=>clue.label>path.length)||puzzle.clues.at(-1);}
  function conflictMapFor(candidatePath=path){const conflicts=new Map();for(const clue of puzzle.clues){const expectedPos=clue.label-1,actualPos=candidatePath.indexOf(clue.index);if(expectedPos<candidatePath.length&&candidatePath[expectedPos]!==clue.index)conflicts.set(clue.index,`step:${clue.label}`);if(actualPos>=0&&actualPos!==expectedPos)conflicts.set(clue.index,`cell:${clue.label}`);}return conflicts;}
  function updateMistakes(before,after){for(const[key,value]of after){const signature=`${key}:${value}`;if(!before.has(signature)&&!conflictKeys.has(signature)){conflictKeys.add(signature);mistakes++;}}onMetrics({mistakes});}
  function isValidCompletePath(){if(path.length!==puzzle.openCount||new Set(path).size!==path.length)return false;for(const clue of puzzle.clues)if(path[clue.label-1]!==clue.index)return false;return true;}
  function svgNode(tag,attrs){const node=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;}
  function drawSolutionGuide(focusStep){guideSvg.replaceChildren();if(!solutionVisible)return;const full=svgNode('polyline',{points:routePoints(puzzle.solution,puzzle.size),fill:'none',stroke:'rgba(40,201,245,.27)','stroke-width':'3.2','stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'}),past=svgNode('polyline',{points:routePoints(puzzle.solution.slice(0,Math.max(2,focusStep)),puzzle.size),fill:'none',stroke:'rgba(123,106,255,.66)','stroke-width':'4.2','stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'}),index=puzzle.solution[Math.max(0,focusStep-1)],row=Math.floor(index/puzzle.size),col=index%puzzle.size,halo=svgNode('circle',{cx:col+.5,cy:row+.5,r:'.24',fill:'rgba(216,248,255,.22)',stroke:'#d8f8ff','stroke-width':'2.4','vector-effect':'non-scaling-stroke'});guideSvg.append(full,past,halo);}
  function render(){const pathSet=new Set(path),prefix=prefixLength(),nextStep=complete?0:Math.min(puzzle.solution.length,prefix+1),focusStep=solutionVisible?solutionCursor:nextStep,hintMap=new Map(hintGuide.map((idx,i)=>[idx,i+1])),conflicts=conflictMapFor();grid.querySelectorAll('.number-cell').forEach(cell=>{const idx=Number(cell.dataset.index),step=solutionStep.get(idx),hintOrder=hintMap.get(idx);cell.classList.toggle('in-path',pathSet.has(idx));cell.classList.toggle('path-head',path.at(-1)===idx&&!complete);cell.classList.toggle('hinted',hintOrder!=null);cell.classList.toggle('checkpoint-conflict',conflicts.has(idx));cell.classList.toggle('solution-focus',solutionVisible&&step===focusStep);cell.querySelectorAll('.solution-step-badge,.hint-step-badge').forEach(el=>el.remove());if(solutionVisible&&step===focusStep){cell.style.outline='2px solid rgba(216,248,255,.92)';cell.style.outlineOffset='-3px';}else{cell.style.outline='';cell.style.outlineOffset='';}if(!solutionVisible&&hintOrder!=null){const badge=document.createElement('span');badge.className='hint-step-badge';badge.textContent=String(path.length+hintOrder);badgeStyle(badge,{current:hintOrder===1,hint:true});cell.appendChild(badge);}});drawSolutionGuide(focusStep);onMetrics({cells:path.length,mistakes});}
  function finish(){complete=true;host.classList.add('game-solved-bloom');render();if(practice){onStatus('Practice complete — every numbered step was reached correctly.');onPracticeComplete('Number Path practice complete. Reset to practice this board again, or start a New Puzzle.');}else{onStatus('Number Path complete.');onComplete();}}
  function addCell(index){if(complete||!openSet.has(index))return false;const last=path.at(-1);if(index===last)return true;if(!areAdjacent(last,index,puzzle.size))return false;const existing=path.indexOf(index);if(existing>=0){if(existing===path.length-2){path.pop();hintGuide=[];render();const conflicts=conflictMapFor();onStatus(conflicts.size?`${conflicts.size} checkpoint contradiction${conflicts.size===1?'':'s'} remain. Keep undoing or choose another branch.`:`Backtracked to step ${path.length}.`);return true;}return false;}
    if(solutionVisible){const prefix=prefixLength();if(prefix<path.length){const expected=puzzle.solution[prefix];pulseCell(expected);onStatus(`Practice guide: backtrack. Step ${prefix+1} is still next.`);return false;}const expected=puzzle.solution[path.length];if(index!==expected){pulseCell(expected);onStatus(`Practice guide: step ${path.length+1} is next.`);return false;}}
    const before=conflictMapFor(),beforeSet=new Set([...before].map(([key,value])=>`${key}:${value}`));path.push(index);hintGuide=[];const after=conflictMapFor();updateMistakes(beforeSet,after);if(solutionVisible)solutionCursor=Math.min(puzzle.solution.length,path.length+1);render();pulseCell(index);
    if(path.length===puzzle.openCount){if(isValidCompletePath())finish();else onStatus(`Path filled, but ${after.size} checkpoint contradiction${after.size===1?'':'s'} remain. Undo and repair the route.`);return true;}
    const next=nextCheckpoint();if(solutionVisible)onStatus('');else if(after.size)onStatus(`${after.size} checkpoint contradiction${after.size===1?'':'s'}. The move is allowed — use Undo when you decide to backtrack.`);else onStatus(`Step ${path.length} of ${puzzle.openCount}. Next checkpoint: ${next?.label||puzzle.openCount}.`);return true;}
  function indexAt(clientX,clientY){const rect=grid.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return-1;const c=Math.min(puzzle.size-1,Math.floor(x/rect.width*puzzle.size)),r=Math.min(puzzle.size-1,Math.floor(y/rect.height*puzzle.size));return r*puzzle.size+c;}
  function dragThrough(clientX,clientY){if(!lastPointer){lastPointer=[clientX,clientY];const idx=indexAt(clientX,clientY);if(idx>=0)addCell(idx);return;}const[sx,sy]=lastPointer,dx=clientX-sx,dy=clientY-sy,rect=grid.getBoundingClientRect(),cellSize=rect.width/puzzle.size,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,cellSize*.09)));for(let i=1;i<=steps;i++){const idx=indexAt(sx+dx*i/steps,sy+dy*i/steps);if(idx>=0)addCell(idx);}lastPointer=[clientX,clientY];}
  grid.addEventListener('click',e=>{if(dragging||complete)return;const cell=e.target.closest('.number-cell');if(cell)addCell(Number(cell.dataset.index));});grid.addEventListener('pointerdown',e=>{if(complete)return;const idx=indexAt(e.clientX,e.clientY);if(idx<0||!openSet.has(idx))return;dragging=true;lastPointer=[e.clientX,e.clientY];grid.setPointerCapture?.(e.pointerId);addCell(idx);e.preventDefault();});grid.addEventListener('pointermove',e=>{if(!dragging||complete)return;const events=e.getCoalescedEvents?.()||[e];for(const point of events)dragThrough(point.clientX,point.clientY);e.preventDefault();});const end=()=>{dragging=false;lastPointer=null;};grid.addEventListener('pointerup',end);grid.addEventListener('pointercancel',end);
  onMetrics({cells:1,mistakes:0,hints:0});onStatus(`Start at 1. Checkpoints must match their exact path step. Regular Play allows contradictions so you can reason, notice them and Undo yourself.`);render();
  return{supportsUndo:true,undo(){if(complete||path.length<=1)return;path.pop();hintGuide=[];if(solutionVisible)solutionCursor=Math.min(puzzle.solution.length,path.length+1);render();const conflicts=conflictMapFor();onStatus(solutionVisible?'':conflicts.size?`${conflicts.size} checkpoint contradiction${conflicts.size===1?'':'s'} remain.`:`Backtracked to step ${path.length}.`);},reset(){host.classList.remove('game-solved-bloom');path=[puzzle.solution[0]];mistakes=0;conflictKeys=new Set();hintGuide=[];solutionVisible=false;practice=false;complete=false;hintUses=0;solutionCursor=1;render();onStatus('Path reset. Start again at 1.');},hint(){if(complete||solutionVisible)return false;hintUses++;const prefix=prefixLength(),reveal=Math.min(3,hintUses);if(prefix<path.length){hintGuide=[path.at(-2)??path[0]];onStatus(`Hint ${hintUses}: your current route no longer matches one verified solution. Backtrack toward the highlighted cell.`);}else if(path.length<puzzle.solution.length){hintGuide=puzzle.solution.slice(path.length,path.length+reveal);let from=path.at(-1);const dirs=[];for(const idx of hintGuide){dirs.push(directionLabel(from,idx,puzzle.size));from=idx;}onStatus(hintUses===1?`Hint 1: step ${path.length+1} is highlighted (${dirs[0]}).`:`Hint ${hintUses}: next ${hintGuide.length} steps — ${dirs.join(' → ')}.`);}else return false;render();setTimeout(()=>{if(!complete){hintGuide=[];render();}},4200);return true;},solution(){if(complete)return;practice=true;solutionVisible=true;hintGuide=[];solutionCursor=Math.min(puzzle.solution.length,Math.max(1,prefixLength()+1));render();onStatus('');},solutionStep(delta=0){if(!solutionVisible||complete)return null;solutionCursor=Math.max(1,Math.min(puzzle.solution.length,solutionCursor+delta));render();onStatus('');return{current:solutionCursor,total:puzzle.solution.length,label:`Step ${solutionCursor}`};},hideSolution(){if(complete)return;solutionVisible=false;hintGuide=[];render();onStatus('');},previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:mistakes*180,hintPenalty:hints*190});},getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:mistakes*180,hintPenalty:hints*190}),metadata:{cells:path.length,open_cells:puzzle.openCount,blocked_cells:puzzle.blocked.length,mistakes,size:puzzle.size,path:[...path],complexity:puzzle.quality?.score||0}};},destroy(){host.classList.remove('game-solved-bloom');}};
}
