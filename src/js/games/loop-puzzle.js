import {rngFromSeed,scoreFromPerformance,scoreTimeDivisor} from './utils.js';

const LEVEL={easy:{size:5,clueRate:.90},medium:{size:7,clueRate:.58},hard:{size:9,clueRate:.34}},hKey=(r,c)=>`h:${r}:${c}`,vKey=(r,c)=>`v:${r}:${c}`;
const PRACTICE_ARIA_HINT='Ghost edges show one valid solution. Draw them in any order.';

function blobRegion(size,seed){
  const rng=rngFromSeed(seed),center=(size-1)/2,cells=new Set();
  let prevLeft=Math.max(1,Math.floor(center)-1),prevRight=Math.min(size-2,Math.ceil(center)+1);
  for(let r=1;r<size-1;r++){
    const distance=Math.abs(r-center),widthBoost=Math.max(0,Math.floor((size/2-distance)/2));
    let left=prevLeft+(rng()<.35?-1:rng()>.75?1:0),right=prevRight+(rng()<.35?1:rng()>.75?-1:0);
    left=Math.max(0,Math.min(Math.floor(center)-1,left-widthBoost));
    right=Math.min(size-1,Math.max(Math.ceil(center)+1,right+widthBoost));
    for(let c=left;c<=right;c++)cells.add(`${r}:${c}`);
    prevLeft=left;
    prevRight=right;
  }
  return cells;
}

export function generateLoopPuzzle(difficulty='easy',seed='loop-puzzle'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,region=blobRegion(cfg.size,`${seed}:v3`),solution=new Set();
  for(let r=0;r<cfg.size;r++)for(let c=0;c<cfg.size;c++){
    if(!region.has(`${r}:${c}`))continue;
    if(r===0||!region.has(`${r-1}:${c}`))solution.add(hKey(r,c));
    if(r===cfg.size-1||!region.has(`${r+1}:${c}`))solution.add(hKey(r+1,c));
    if(c===0||!region.has(`${r}:${c-1}`))solution.add(vKey(r,c));
    if(c===cfg.size-1||!region.has(`${r}:${c+1}`))solution.add(vKey(r,c+1));
  }
  const rng=rngFromSeed(`${seed}:clues:v3`),clues=[];
  for(let r=0;r<cfg.size;r++)for(let c=0;c<cfg.size;c++){
    const edges=[hKey(r,c),hKey(r+1,c),vKey(r,c),vKey(r,c+1)],value=edges.filter(edge=>solution.has(edge)).length;
    if(rng()<=cfg.clueRate)clues.push({r,c,value});
  }
  return{size:cfg.size,solution:[...solution],clues,seed,difficulty};
}

function edgeNodes(edge){
  const[type,rs,cs]=edge.split(':'),r=Number(rs),c=Number(cs);
  return type==='h'?[`${r}:${c}`,`${r}:${c+1}`]:[`${r}:${c}`,`${r+1}:${c}`];
}

export function orderLoopEdges(edges){
  const list=[...edges],byNode=new Map();
  for(const edge of list)for(const node of edgeNodes(edge)){
    if(!byNode.has(node))byNode.set(node,[]);
    byNode.get(node).push(edge);
  }
  if(!list.length)return[];
  let currentNode=[...byNode.keys()].sort()[0],previousEdge=null;
  const ordered=[];
  for(let i=0;i<list.length;i++){
    const options=(byNode.get(currentNode)||[]).filter(edge=>edge!==previousEdge),edge=options[0];
    if(!edge||ordered.includes(edge))break;
    ordered.push(edge);
    const[a,b]=edgeNodes(edge);
    currentNode=currentNode===a?b:a;
    previousEdge=edge;
  }
  return ordered.length===list.length?ordered:list;
}

export function isSingleLoop(edges,size){
  if(!edges.length)return false;
  const adjacency=new Map(),add=(a,b)=>{
    if(!adjacency.has(a))adjacency.set(a,[]);
    if(!adjacency.has(b))adjacency.set(b,[]);
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  };
  for(const edge of edges){const[a,b]=edgeNodes(edge);add(a,b);}
  if([...adjacency.values()].some(list=>list.length!==2))return false;
  const start=adjacency.keys().next().value,seen=new Set([start]),queue=[start];
  while(queue.length){
    const node=queue.shift();
    for(const next of adjacency.get(node)||[])if(!seen.has(next)){seen.add(next);queue.push(next);}
  }
  return seen.size===adjacency.size;
}

const clueEdges=clue=>[hKey(clue.r,clue.c),hKey(clue.r+1,clue.c),vKey(clue.r,clue.c+1),vKey(clue.r,clue.c)];
export function cluesSatisfied(edges,clues){const active=edges instanceof Set?edges:new Set(edges);return clues.every(clue=>clueEdges(clue).filter(edge=>active.has(edge)).length===clue.value);}
export function clueConflicts(edges,clues){const active=edges instanceof Set?edges:new Set(edges);return clues.filter(clue=>clueEdges(clue).filter(edge=>active.has(edge)).length>clue.value).length;}
export function isValidLoopSolution(edges,puzzle){return isSingleLoop([...edges],puzzle.size)&&cluesSatisfied(edges,puzzle.clues);}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateLoopPuzzle(difficulty,seed),hiddenSolution=new Set(puzzle.solution),timeDivisor=scoreTimeDivisor('loop-puzzle',difficulty);
  let active=new Set(),hinted=null,hintRemove=false,solutionVisible=false,practice=false,complete=false,hintUses=0,hintTimer=null;
  const size=puzzle.size,step=100/size;

  host.innerHTML='<div class="loop-wrap"><svg class="loop-svg" viewBox="-2 -2 104 104" role="img" aria-label="Loop Puzzle board"></svg></div>';
  const svg=host.querySelector('svg'),ns='http://www.w3.org/2000/svg';
  svg.setAttribute('aria-description',PRACTICE_ARIA_HINT);

  for(let r=0;r<=size;r++)for(let c=0;c<size;c++){
    const y=r*step,x1=c*step,x2=(c+1)*step,key=hKey(r,c),base=document.createElementNS(ns,'line'),hit=document.createElementNS(ns,'line');
    base.setAttribute('x1',x1);base.setAttribute('x2',x2);base.setAttribute('y1',y);base.setAttribute('y2',y);base.setAttribute('class','loop-base');svg.appendChild(base);
    hit.setAttribute('x1',x1);hit.setAttribute('x2',x2);hit.setAttribute('y1',y);hit.setAttribute('y2',y);hit.setAttribute('class','loop-hit');hit.dataset.edge=key;svg.appendChild(hit);
  }
  for(let r=0;r<size;r++)for(let c=0;c<=size;c++){
    const x=c*step,y1=r*step,y2=(r+1)*step,key=vKey(r,c),base=document.createElementNS(ns,'line'),hit=document.createElementNS(ns,'line');
    base.setAttribute('x1',x);base.setAttribute('x2',x);base.setAttribute('y1',y1);base.setAttribute('y2',y2);base.setAttribute('class','loop-base');svg.appendChild(base);
    hit.setAttribute('x1',x);hit.setAttribute('x2',x);hit.setAttribute('y1',y1);hit.setAttribute('y2',y2);hit.setAttribute('class','loop-hit');hit.dataset.edge=key;svg.appendChild(hit);
  }

  puzzle.clues.forEach((clue,index)=>{
    const x=(clue.c+.5)*step,y=(clue.r+.5)*step,text=document.createElementNS(ns,'text');
    text.setAttribute('x',x);
    text.setAttribute('y',y);
    text.setAttribute('dominant-baseline','central');
    text.setAttribute('class',`loop-clue clue-${clue.value}`);
    text.dataset.clue=String(index);
    text.textContent=String(clue.value);
    svg.appendChild(text);
  });

  for(let r=0;r<=size;r++)for(let c=0;c<=size;c++){
    const dot=document.createElementNS(ns,'circle');
    dot.setAttribute('cx',c*step);dot.setAttribute('cy',r*step);dot.setAttribute('r','.72');dot.setAttribute('class','loop-dot');svg.appendChild(dot);
  }

  const hintMarker=document.createElementNS(ns,'text');
  hintMarker.setAttribute('class','loop-hint-marker');
  hintMarker.setAttribute('text-anchor','middle');
  hintMarker.setAttribute('dominant-baseline','central');
  hintMarker.setAttribute('aria-hidden','true');
  hintMarker.setAttribute('visibility','hidden');
  svg.appendChild(hintMarker);

  function edgeMidpoint(edge){
    const[type,rs,cs]=edge.split(':'),r=Number(rs),c=Number(cs);
    return type==='h'?{x:(c+.5)*step,y:r*step}:{x:c*step,y:(r+.5)*step};
  }

  function clearHint(){
    hinted=null;
    hintRemove=false;
    if(hintTimer){clearTimeout(hintTimer);hintTimer=null;}
  }

  function renderHintMarker(){
    if(!hinted||complete){
      hintMarker.setAttribute('visibility','hidden');
      hintMarker.textContent='';
      return;
    }
    const{x,y}=edgeMidpoint(hinted);
    hintMarker.setAttribute('x',x);
    hintMarker.setAttribute('y',y);
    hintMarker.setAttribute('class',`loop-hint-marker ${hintRemove?'remove':'add'}`);
    hintMarker.textContent=hintRemove?'×':'+';
    hintMarker.setAttribute('visibility','visible');
  }

  function renderClues(){
    puzzle.clues.forEach((clue,index)=>{
      const selected=clueEdges(clue).filter(edge=>active.has(edge)).length,text=svg.querySelector(`.loop-clue[data-clue="${index}"]`),satisfied=selected===clue.value,conflict=selected>clue.value;
      text?.classList.toggle('satisfied',satisfied&&!conflict);
      text?.classList.toggle('conflict',conflict);
    });
  }

  function render(){
    svg.querySelectorAll('.loop-hit').forEach(line=>{
      const edge=line.dataset.edge;
      line.classList.toggle('active',active.has(edge));
      line.classList.toggle('hinted',hinted===edge&&!hintRemove);
      line.classList.toggle('hint-remove',hinted===edge&&hintRemove);
      line.classList.toggle('solution-edge',solutionVisible&&!complete&&hiddenSolution.has(edge)&&!active.has(edge));
      line.classList.toggle('practice-wrong',solutionVisible&&!complete&&active.has(edge)&&!hiddenSolution.has(edge));
      line.style.pointerEvents=complete?'none':'stroke';
    });
    renderClues();
    renderHintMarker();
    onMetrics({edges:active.size,mistakes:clueConflicts(active,puzzle.clues)});
  }

  function finish(){
    complete=true;
    clearHint();
    host.classList.add('game-solved-bloom');
    render();
    if(practice){
      onStatus('');
      onPracticeComplete('Loop Puzzle practice complete. Reset to build this loop again, or start a New Puzzle.');
    }else{
      onStatus('Loop complete — every visible clue is satisfied.');
      onComplete();
    }
  }

  function checkComplete(){if(complete)return true;if(!isValidLoopSolution(active,puzzle))return false;finish();return true;}

  function conflictEdge(){
    for(const clue of puzzle.clues){
      const selected=clueEdges(clue).filter(edge=>active.has(edge));
      if(selected.length>clue.value)return selected.find(edge=>!hiddenSolution.has(edge))||selected[0];
    }
    return null;
  }

  function setHint(edge,remove){
    if(!edge)return false;
    if(hintTimer)clearTimeout(hintTimer);
    hinted=edge;
    hintRemove=remove;
    render();
    onStatus('');
    hintTimer=setTimeout(()=>{
      if(!complete&&!solutionVisible){hinted=null;hintRemove=false;render();}
      hintTimer=null;
    },4200);
    return true;
  }

  svg.addEventListener('click',event=>{
    if(complete)return;
    const line=event.target.closest?.('.loop-hit');
    if(!line)return;
    const edge=line.dataset.edge;
    if(active.has(edge))active.delete(edge);else active.add(edge);
    line.animate?.([{opacity:.45},{opacity:1}],{duration:150,easing:'ease-out'});
    clearHint();
    render();
    if(!checkComplete()){
      const conflicts=clueConflicts(active,puzzle.clues);
      onStatus(conflicts?`${conflicts} clue conflict${conflicts===1?'':'s'} — red clues have too many selected sides.`:'');
    }
  });

  onMetrics({edges:0,mistakes:0,hints:0});
  onStatus('');
  render();

  return{
    supportsUndo:false,
    reset(){
      host.classList.remove('game-solved-bloom');
      active=new Set();
      clearHint();
      solutionVisible=false;
      practice=false;
      complete=false;
      hintUses=0;
      render();
      onStatus('');
    },
    hint(){
      if(complete||solutionVisible)return false;
      hintUses++;
      const conflict=conflictEdge();
      if(conflict)return setHint(conflict,true);
      const safe=[...hiddenSolution].find(edge=>!active.has(edge)&&clueConflicts(new Set([...active,edge]),puzzle.clues)===0);
      if(safe)return setHint(safe,false);
      const towardCanonical=[...active].find(edge=>!hiddenSolution.has(edge));
      if(towardCanonical)return setHint(towardCanonical,true);
      return false;
    },
    solution(){
      if(complete)return;
      practice=true;
      solutionVisible=true;
      clearHint();
      render();
      onStatus('');
    },
    hideSolution(){
      if(complete)return;
      solutionVisible=false;
      clearHint();
      render();
      onStatus('');
    },
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:clueConflicts(active,puzzle.clues)*130,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:clueConflicts(active,puzzle.clues)*130,hintPenalty:hints*190}),metadata:{edges:active.size,conflicts:clueConflicts(active,puzzle.clues),clues:puzzle.clues.length,size,actual_edges:[...active]}};},
    destroy(){
      clearHint();
      host.classList.remove('game-solved-bloom');
    }
  };
}
