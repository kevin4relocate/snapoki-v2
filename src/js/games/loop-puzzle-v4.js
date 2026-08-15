import {rngFromSeed,scoreFromPerformance,scoreTimeDivisor,shuffle} from './utils.js';

const LEVEL={
  easy:{size:5,candidates:18,shapeMin:18,clueTarget:[14,20],zeroMax:5,anchorMin:1,nodeLimit:900},
  medium:{size:7,candidates:44,shapeMin:34,clueTarget:[17,25],zeroMax:5,anchorMin:2,nodeLimit:2600},
  hard:{size:9,candidates:90,shapeMin:58,clueTarget:[18,27],zeroMax:6,anchorMin:3,nodeLimit:6500}
};
const hKey=(r,c)=>`h:${r}:${c}`,vKey=(r,c)=>`v:${r}:${c}`;
const PRACTICE_ARIA_HINT='Ghost edges show one valid solution. Draw them in any order.';

function edgeNodes(edge){const[type,rs,cs]=edge.split(':'),r=Number(rs),c=Number(cs);return type==='h'?[`${r}:${c}`,`${r}:${c+1}`]:[`${r}:${c}`,`${r+1}:${c}`];}
const clueEdges=clue=>[hKey(clue.r,clue.c),hKey(clue.r+1,clue.c),vKey(clue.r,clue.c+1),vKey(clue.r,clue.c)];

export function orderLoopEdges(edges){
  const list=[...edges],byNode=new Map();for(const edge of list)for(const node of edgeNodes(edge)){if(!byNode.has(node))byNode.set(node,[]);byNode.get(node).push(edge);}
  if(!list.length)return[];let currentNode=[...byNode.keys()].sort()[0],previousEdge=null;const ordered=[];
  for(let i=0;i<list.length;i++){const options=(byNode.get(currentNode)||[]).filter(edge=>edge!==previousEdge),edge=options[0];if(!edge||ordered.includes(edge))break;ordered.push(edge);const[a,b]=edgeNodes(edge);currentNode=currentNode===a?b:a;previousEdge=edge;}
  return ordered.length===list.length?ordered:list;
}
export function isSingleLoop(edges,size){
  if(!edges.length)return false;const adjacency=new Map(),add=(a,b)=>{if(!adjacency.has(a))adjacency.set(a,[]);if(!adjacency.has(b))adjacency.set(b,[]);adjacency.get(a).push(b);adjacency.get(b).push(a);};
  for(const edge of edges){const[a,b]=edgeNodes(edge);add(a,b);}if([...adjacency.values()].some(list=>list.length!==2))return false;
  const start=adjacency.keys().next().value,seen=new Set([start]),queue=[start];while(queue.length){const node=queue.shift();for(const next of adjacency.get(node)||[])if(!seen.has(next)){seen.add(next);queue.push(next);}}return seen.size===adjacency.size;
}
export function cluesSatisfied(edges,clues){const active=edges instanceof Set?edges:new Set(edges);return clues.every(clue=>clueEdges(clue).filter(edge=>active.has(edge)).length===clue.value);}
export function clueConflicts(edges,clues){const active=edges instanceof Set?edges:new Set(edges);return clues.filter(clue=>clueEdges(clue).filter(edge=>active.has(edge)).length>clue.value).length;}
export function isValidLoopSolution(edges,puzzle){return isSingleLoop([...edges],puzzle.size)&&cluesSatisfied(edges,puzzle.clues);}

function regionNeighbors(r,c,size){const out=[];if(r>0)out.push([r-1,c]);if(r<size-1)out.push([r+1,c]);if(c>0)out.push([r,c-1]);if(c<size-1)out.push([r,c+1]);return out;}
function isConnectedRegion(cells,size){if(!cells.size)return false;const start=cells.values().next().value,seen=new Set([start]),queue=[start];while(queue.length){const key=queue.shift(),[r,c]=key.split(':').map(Number);for(const[nr,nc]of regionNeighbors(r,c,size)){const next=`${nr}:${nc}`;if(cells.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}}}return seen.size===cells.size;}
function hasHole(cells,size){
  const outside=new Set(),queue=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(r===0||c===0||r===size-1||c===size-1){const key=`${r}:${c}`;if(!cells.has(key)&&!outside.has(key)){outside.add(key);queue.push(key);}}
  while(queue.length){const key=queue.shift(),[r,c]=key.split(':').map(Number);for(const[nr,nc]of regionNeighbors(r,c,size)){const next=`${nr}:${nc}`;if(!cells.has(next)&&!outside.has(next)){outside.add(next);queue.push(next);}}}
  for(let r=0;r<size;r++)for(let c=0;c<size;c++){const key=`${r}:${c}`;if(!cells.has(key)&&!outside.has(key))return true;}return false;
}
function boundaryOfRegion(region,size){const solution=new Set();for(let r=0;r<size;r++)for(let c=0;c<size;c++){if(!region.has(`${r}:${c}`))continue;if(r===0||!region.has(`${r-1}:${c}`))solution.add(hKey(r,c));if(r===size-1||!region.has(`${r+1}:${c}`))solution.add(hKey(r+1,c));if(c===0||!region.has(`${r}:${c-1}`))solution.add(vKey(r,c));if(c===size-1||!region.has(`${r}:${c+1}`))solution.add(vKey(r,c+1));}return solution;}
function randomRegion(size,seed,difficulty){
  const rng=rngFromSeed(seed),center=Math.floor(size/2),cells=new Set([`${center}:${center}`]),target=Math.round(size*size*({easy:.46,medium:.43,hard:.40}[difficulty]||.42));
  while(cells.size<target){const frontier=[];for(const key of cells){const[r,c]=key.split(':').map(Number);for(const[nr,nc]of regionNeighbors(r,c,size)){const next=`${nr}:${nc}`;if(!cells.has(next))frontier.push(next);}}if(!frontier.length)break;const unique=[...new Set(frontier)],weighted=unique.map(key=>{const[r,c]=key.split(':').map(Number),interior=r>0&&c>0&&r<size-1&&c<size-1?1:0,neighbors=regionNeighbors(r,c,size).filter(([nr,nc])=>cells.has(`${nr}:${nc}`)).length;return{key,score:rng()*4+interior*1.6+(difficulty==='hard'?(neighbors===1?2.4:-neighbors*.45):neighbors*.35)};}).sort((a,b)=>b.score-a.score);cells.add(weighted[0].key);}
  if(difficulty!=='easy'){
    for(let pass=0;pass<(difficulty==='hard'?size*3:size);pass++){
      const removable=shuffle([...cells],rng);for(const key of removable){if(cells.size<=target*.78)break;const[r,c]=key.split(':').map(Number);if(r===center&&c===center)continue;const adjacent=regionNeighbors(r,c,size).filter(([nr,nc])=>cells.has(`${nr}:${nc}`)).length;if(adjacent<2||rng()>.28)continue;const next=new Set(cells);next.delete(key);if(isConnectedRegion(next,size)&&!hasHole(next,size)){cells.delete(key);break;}}
    }
  }
  return cells;
}
function shapeMetrics(solution,size){
  const ordered=orderLoopEdges(solution);let turns=0,longestStraight=0,currentStraight=0,lastDir='',perimeterEdges=0,interiorEdges=0,reEntries=0,lastPerimeter=null;
  for(let i=0;i<ordered.length;i++){
    const edge=ordered[i],[type,rs,cs]=edge.split(':'),r=Number(rs),c=Number(cs),dir=type,perimeter=type==='h'?(r===0||r===size):(c===0||c===size);if(perimeter)perimeterEdges++;else interiorEdges++;
    if(lastDir){if(dir!==lastDir){turns++;currentStraight=1;}else currentStraight++;}else currentStraight=1;longestStraight=Math.max(longestStraight,currentStraight);if(lastPerimeter!=null&&perimeter!==lastPerimeter)reEntries++;lastPerimeter=perimeter;lastDir=dir;
  }
  const perimeterRatio=ordered.length?perimeterEdges/ordered.length:1,interiorRatio=ordered.length?interiorEdges/ordered.length:0,score=turns*3.2+reEntries*4.5+interiorRatio*80-longestStraight*5.5-perimeterRatio*95+ordered.length*.35;
  return{edgeCount:ordered.length,turns,longestStraight,perimeterEdges,perimeterRatio,interiorRatio,reEntries,score};
}
function shapeGate(difficulty,m,size){if(difficulty==='easy')return m.turns>=6&&m.longestStraight<=size+1;if(difficulty==='medium')return m.turns>=12&&m.longestStraight<=Math.max(6,size-1)&&m.perimeterRatio<=.48&&m.reEntries>=4;return m.turns>=18&&m.longestStraight<=6&&m.perimeterRatio<=.36&&m.interiorRatio>=.64&&m.reEntries>=7;}
function allClues(solution,size){const clues=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++){const clue={r,c,value:0};clue.value=clueEdges(clue).filter(edge=>solution.has(edge)).length;clues.push(clue);}return clues;}
function neighborClues(clue,size){const out=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const r=clue.r+dr,c=clue.c+dc;if(r>=0&&c>=0&&r<size&&c<size)out.push([r,c]);}return out;}
function localTurnPressure(clue,solution,size){const edges=clueEdges(clue),active=edges.filter(edge=>solution.has(edge));if(active.length!==2)return active.length===3?2.8:active.length===1?1.2:0;const types=new Set(active.map(edge=>edge[0]));return types.size===2?3.2:.8;}
function patternInfo(clue,grid,size){
  const around=neighborClues(clue,size).map(([r,c])=>grid[r*size+c]),diag=around.filter(other=>Math.abs(other.r-clue.r)===1&&Math.abs(other.c-clue.c)===1),orth=around.filter(other=>Math.abs(other.r-clue.r)+Math.abs(other.c-clue.c)===1);let bonus=0,anchor=false,pattern='';
  if(clue.value===3&&diag.some(x=>x.value===3)){bonus+=8;anchor=true;pattern='diag-3';}
  if(clue.value===3&&orth.some(x=>x.value===2)){bonus+=5;anchor=true;pattern=pattern||'2-3';}
  if(clue.value===2&&orth.some(x=>x.value===3)){bonus+=4.5;anchor=true;pattern=pattern||'2-3';}
  if(clue.value===0&&around.some(x=>x.value===3)){bonus+=5;anchor=true;pattern='0-near-3';}
  if(clue.value===2&&around.filter(x=>x.value===2).length>=2){bonus+=3;pattern=pattern||'2-chain';}
  return{bonus,anchor,pattern};
}
function strategicClues(solution,size,difficulty,seed,cfg){
  const grid=allClues(solution,size),rng=rngFromSeed(`${seed}:clues-v4`),scored=grid.map(clue=>{const pattern=patternInfo(clue,grid,size),pressure=localTurnPressure(clue,solution,size),centerDist=Math.abs(clue.r-(size-1)/2)+Math.abs(clue.c-(size-1)/2),interiorBonus=(size-centerDist)/size*2.2,valueWeight=[-1.8,.8,3.8,6.2][clue.value],score=valueWeight+pressure*2.1+interiorBonus+pattern.bonus+rng()*1.5;return{...clue,...pattern,pressure,score};});
  const selected=[],selectedKey=new Set(),add=clue=>{const key=`${clue.r}:${clue.c}`;if(selectedKey.has(key))return false;selectedKey.add(key);selected.push(clue);return true;};
  const anchors=scored.filter(x=>x.anchor).sort((a,b)=>b.score-a.score);for(const clue of anchors.slice(0,Math.max(cfg.anchorMin,Math.ceil(anchors.length*.45))))add(clue);
  let zeroCount=selected.filter(x=>x.value===0).length;const targetMin=cfg.clueTarget[0],targetMax=cfg.clueTarget[1];
  for(const clue of scored.sort((a,b)=>b.score-a.score)){
    if(selected.length>=targetMax)break;if(clue.value===0&&zeroCount>=cfg.zeroMax)continue;
    if(clue.value===0){const touchingZero=selected.some(x=>x.value===0&&Math.abs(x.r-clue.r)<=1&&Math.abs(x.c-clue.c)<=1);if(touchingZero&&difficulty==='hard')continue;}
    if(clue.value===1&&difficulty!=='easy'){
      const sameRow=selected.filter(x=>x.value===1&&x.r===clue.r&&Math.abs(x.c-clue.c)<=2).length,sameCol=selected.filter(x=>x.value===1&&x.c===clue.c&&Math.abs(x.r-clue.r)<=2).length;if(sameRow>=2||sameCol>=2)continue;
    }
    if(add(clue)&&clue.value===0)zeroCount++;
    if(selected.length>=targetMin&&rng()<.34)break;
  }
  for(const clue of scored.sort((a,b)=>b.score-a.score))if(selected.length<targetMin){if(clue.value===0&&zeroCount>=cfg.zeroMax)continue;if(add(clue)&&clue.value===0)zeroCount++;}
  return selected.map(({r,c,value,anchor=false,pattern='',score=0})=>({r,c,value,anchor,pattern,strategicScore:Math.round(score*10)/10}));
}
function clueQuality(clues,size,difficulty){
  const zeros=clues.filter(c=>c.value===0),ones=clues.filter(c=>c.value===1),twos=clues.filter(c=>c.value===2),threes=clues.filter(c=>c.value===3),anchors=clues.filter(c=>c.anchor);let zeroAdj=0,zero2x2=0,longOneRuns=0;
  const map=new Map(clues.map(c=>[`${c.r}:${c.c}`,c]));for(const clue of zeros){for(const[nr,nc]of[[clue.r+1,clue.c],[clue.r,clue.c+1]])if(map.get(`${nr}:${nc}`)?.value===0)zeroAdj++;if(map.get(`${clue.r+1}:${clue.c}`)?.value===0&&map.get(`${clue.r}:${clue.c+1}`)?.value===0&&map.get(`${clue.r+1}:${clue.c+1}`)?.value===0)zero2x2++;}
  for(let r=0;r<size;r++){let run=0;for(let c=0;c<size;c++){if(map.get(`${r}:${c}`)?.value===1)run++;else{if(run>=3)longOneRuns++;run=0;}}if(run>=3)longOneRuns++;}
  for(let c=0;c<size;c++){let run=0;for(let r=0;r<size;r++){if(map.get(`${r}:${c}`)?.value===1)run++;else{if(run>=3)longOneRuns++;run=0;}}if(run>=3)longOneRuns++;}
  const score=anchors.length*12+twos.length*2.8+threes.length*6-zeros.length*1.6-zeroAdj*8-zero2x2*40-longOneRuns*14;
  const valid=difficulty==='easy'?zero2x2===0:difficulty==='medium'?zero2x2===0&&zeroAdj<=2&&anchors.length>=1:zero2x2===0&&zeroAdj<=1&&zeros.length<=6&&anchors.length>=2&&longOneRuns===0;
  return{zeros:zeros.length,ones:ones.length,twos:twos.length,threes:threes.length,anchors:anchors.length,zeroAdj,zero2x2,longOneRuns,score,valid};
}

function buildEdgeUniverse(size){const out=[];for(let r=0;r<=size;r++)for(let c=0;c<size;c++)out.push(hKey(r,c));for(let r=0;r<size;r++)for(let c=0;c<=size;c++)out.push(vKey(r,c));return out;}
function solverComplexity(puzzle,nodeLimit){
  const solution=new Set(puzzle.solution),universe=buildEdgeUniverse(puzzle.size),clueSet=new Set(puzzle.clues.flatMap(clue=>clueEdges(clue))),relevant=[...new Set([...clueSet,...puzzle.solution])],stats={nodes:0,backtracks:0,deadEnds:0,decisions:0,forced:0,aborted:false};
  const clueByEdge=new Map();for(const clue of puzzle.clues)for(const edge of clueEdges(clue)){if(!clueByEdge.has(edge))clueByEdge.set(edge,[]);clueByEdge.get(edge).push(clue);}
  const assignment=new Map();
  function contradiction(){for(const clue of puzzle.clues){const edges=clueEdges(clue),on=edges.filter(e=>assignment.get(e)===1).length,unknown=edges.filter(e=>!assignment.has(e)).length;if(on>clue.value||on+unknown<clue.value)return true;}return false;}
  function choose(){let best=null,bestPressure=-1;for(const edge of relevant)if(!assignment.has(edge)){let pressure=0;for(const clue of clueByEdge.get(edge)||[]){const edges=clueEdges(clue),unknown=edges.filter(e=>!assignment.has(e)).length;pressure+=5-unknown+(clue.value===2?1.5:clue.value===3?2:0);}if(pressure>bestPressure){bestPressure=pressure;best=edge;}}return best;}
  function dfs(){if(++stats.nodes>nodeLimit){stats.aborted=true;return false;}if(contradiction()){stats.deadEnds++;return false;}const edge=choose();if(!edge)return true;stats.decisions++;const preferred=solution.has(edge)?1:0;for(const value of[1-preferred,preferred]){assignment.set(edge,value);if(dfs())return true;assignment.delete(edge);stats.backtracks++;if(stats.aborted)return false;}return false;}
  dfs();stats.relevantEdges=relevant.length;stats.universeEdges=universe.length;stats.score=Math.min(100,Math.round((Math.min(stats.backtracks,60)*1.1+Math.min(stats.deadEnds,60)*.8+Math.min(stats.decisions,90)*.5)*10)/10);return stats;
}
function necessityAnalysis(clues){
  const scores=clues.map((clue,index)=>{let nearby=0;for(let j=0;j<clues.length;j++){if(j===index)continue;const other=clues[j],d=Math.abs(other.r-clue.r)+Math.abs(other.c-clue.c);if(d<=1)nearby+=other.value===clue.value?1.2:.4;}const necessity=(clue.anchor?3:0)+(clue.value===3?2.5:clue.value===2?1.6:clue.value===0?1.2:.6)+clue.strategicScore*.08-nearby;return necessity;});
  return{average:scores.reduce((a,b)=>a+b,0)/Math.max(1,scores.length),weak:scores.filter(x=>x<1).length,scores};
}
export function loopComplexity(puzzle){return puzzle.quality||{};}

export function generateLoopPuzzle(difficulty='easy',seed='loop-puzzle'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,candidates=[];
  for(let i=0;i<cfg.candidates;i++){
    const region=randomRegion(cfg.size,`${seed}:region:${i}:v4`,difficulty);if(!isConnectedRegion(region,cfg.size)||hasHole(region,cfg.size))continue;const solution=boundaryOfRegion(region,cfg.size);if(!isSingleLoop([...solution],cfg.size))continue;
    const shape=shapeMetrics(solution,cfg.size);if(!shapeGate(difficulty,shape,cfg.size)||shape.score<cfg.shapeMin)continue;
    const clues=strategicClues(solution,cfg.size,difficulty,`${seed}:${i}`,cfg),clueQ=clueQuality(clues,cfg.size,difficulty);if(!clueQ.valid)continue;
    const base={size:cfg.size,solution:[...solution],clues,seed,difficulty,version:4},solver=solverComplexity(base,cfg.nodeLimit),necessity=necessityAnalysis(clues),quality={shape,clues:clueQ,solver,necessity};quality.score=shape.score+clueQ.score+solver.score+necessity.average*8-necessity.weak*3;candidates.push({...base,quality});
  }
  if(!candidates.length)throw new Error(`Unable to construct quality-gated ${difficulty} Loop Puzzle V4.`);candidates.sort((a,b)=>b.quality.score-a.quality.score);return candidates[0];
}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateLoopPuzzle(difficulty,seed),hiddenSolution=new Set(puzzle.solution),timeDivisor=scoreTimeDivisor('loop-puzzle',difficulty);let active=new Set(),hinted=null,hintRemove=false,solutionVisible=false,practice=false,complete=false,hintUses=0,hintTimer=null;const size=puzzle.size,step=100/size;
  host.innerHTML='<div class="loop-wrap"><svg class="loop-svg" viewBox="-2 -2 104 104" role="img" aria-label="Loop Puzzle board"></svg></div>';const svg=host.querySelector('svg'),ns='http://www.w3.org/2000/svg';svg.setAttribute('aria-description',PRACTICE_ARIA_HINT);
  for(let r=0;r<=size;r++)for(let c=0;c<size;c++){const y=r*step,x1=c*step,x2=(c+1)*step,key=hKey(r,c),base=document.createElementNS(ns,'line'),hit=document.createElementNS(ns,'line');base.setAttribute('x1',x1);base.setAttribute('x2',x2);base.setAttribute('y1',y);base.setAttribute('y2',y);base.setAttribute('class','loop-base');svg.appendChild(base);hit.setAttribute('x1',x1);hit.setAttribute('x2',x2);hit.setAttribute('y1',y);hit.setAttribute('y2',y);hit.setAttribute('class','loop-hit');hit.dataset.edge=key;svg.appendChild(hit);}
  for(let r=0;r<size;r++)for(let c=0;c<=size;c++){const x=c*step,y1=r*step,y2=(r+1)*step,key=vKey(r,c),base=document.createElementNS(ns,'line'),hit=document.createElementNS(ns,'line');base.setAttribute('x1',x);base.setAttribute('x2',x);base.setAttribute('y1',y1);base.setAttribute('y2',y2);base.setAttribute('class','loop-base');svg.appendChild(base);hit.setAttribute('x1',x);hit.setAttribute('x2',x);hit.setAttribute('y1',y1);hit.setAttribute('y2',y2);hit.setAttribute('class','loop-hit');hit.dataset.edge=key;svg.appendChild(hit);}
  puzzle.clues.forEach((clue,index)=>{const x=(clue.c+.5)*step,y=(clue.r+.5)*step,text=document.createElementNS(ns,'text');text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('dominant-baseline','central');text.setAttribute('class',`loop-clue clue-${clue.value}`);text.dataset.clue=String(index);text.textContent=String(clue.value);svg.appendChild(text);});
  for(let r=0;r<=size;r++)for(let c=0;c<=size;c++){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',c*step);dot.setAttribute('cy',r*step);dot.setAttribute('r','.72');dot.setAttribute('class','loop-dot');svg.appendChild(dot);}
  const hintMarker=document.createElementNS(ns,'text');hintMarker.setAttribute('class','loop-hint-marker');hintMarker.setAttribute('text-anchor','middle');hintMarker.setAttribute('dominant-baseline','central');hintMarker.setAttribute('aria-hidden','true');hintMarker.setAttribute('visibility','hidden');svg.appendChild(hintMarker);
  function edgeMidpoint(edge){const[type,rs,cs]=edge.split(':'),r=Number(rs),c=Number(cs);return type==='h'?{x:(c+.5)*step,y:r*step}:{x:c*step,y:(r+.5)*step};}
  function clearHint(){hinted=null;hintRemove=false;if(hintTimer){clearTimeout(hintTimer);hintTimer=null;}}
  function renderHintMarker(){if(!hinted||complete){hintMarker.setAttribute('visibility','hidden');hintMarker.textContent='';return;}const{x,y}=edgeMidpoint(hinted);hintMarker.setAttribute('x',x);hintMarker.setAttribute('y',y);hintMarker.setAttribute('class',`loop-hint-marker ${hintRemove?'remove':'add'}`);hintMarker.textContent=hintRemove?'×':'+';hintMarker.setAttribute('visibility','visible');}
  function renderClues(){puzzle.clues.forEach((clue,index)=>{const selected=clueEdges(clue).filter(edge=>active.has(edge)).length,text=svg.querySelector(`.loop-clue[data-clue="${index}"]`),satisfied=selected===clue.value,conflict=selected>clue.value;text?.classList.toggle('satisfied',satisfied&&!conflict);text?.classList.toggle('conflict',conflict);});}
  function render(){svg.querySelectorAll('.loop-hit').forEach(line=>{const edge=line.dataset.edge;line.classList.toggle('active',active.has(edge));line.classList.toggle('hinted',hinted===edge&&!hintRemove);line.classList.toggle('hint-remove',hinted===edge&&hintRemove);line.classList.toggle('solution-edge',solutionVisible&&!complete&&hiddenSolution.has(edge)&&!active.has(edge));line.classList.toggle('practice-wrong',solutionVisible&&!complete&&active.has(edge)&&!hiddenSolution.has(edge));line.style.pointerEvents=complete?'none':'stroke';});renderClues();renderHintMarker();onMetrics({edges:active.size,mistakes:clueConflicts(active,puzzle.clues)});}
  function finish(){complete=true;clearHint();host.classList.add('game-solved-bloom');render();if(practice){onStatus('');onPracticeComplete('Loop Puzzle practice complete. Reset to build this loop again, or start a New Puzzle.');}else{onStatus('Loop complete — every visible clue is satisfied.');onComplete();}}
  function checkComplete(){if(complete)return true;if(!isValidLoopSolution(active,puzzle))return false;finish();return true;}
  function conflictEdge(){for(const clue of puzzle.clues){const selected=clueEdges(clue).filter(edge=>active.has(edge));if(selected.length>clue.value)return selected.find(edge=>!hiddenSolution.has(edge))||selected[0];}return null;}
  function setHint(edge,remove){if(!edge)return false;if(hintTimer)clearTimeout(hintTimer);hinted=edge;hintRemove=remove;render();onStatus('');hintTimer=setTimeout(()=>{if(!complete&&!solutionVisible){hinted=null;hintRemove=false;render();}hintTimer=null;},4200);return true;}
  svg.addEventListener('click',event=>{if(complete)return;const line=event.target.closest?.('.loop-hit');if(!line)return;const edge=line.dataset.edge;if(active.has(edge))active.delete(edge);else active.add(edge);line.animate?.([{opacity:.45},{opacity:1}],{duration:150,easing:'ease-out'});clearHint();render();if(!checkComplete()){const conflicts=clueConflicts(active,puzzle.clues);onStatus(conflicts?`${conflicts} clue conflict${conflicts===1?'':'s'} — red clues have too many selected sides.`:'');}});
  onMetrics({edges:0,mistakes:0,hints:0});onStatus('');render();
  return{supportsUndo:false,reset(){host.classList.remove('game-solved-bloom');active=new Set();clearHint();solutionVisible=false;practice=false;complete=false;hintUses=0;render();onStatus('');},hint(){if(complete||solutionVisible)return false;hintUses++;const conflict=conflictEdge();if(conflict)return setHint(conflict,true);const safe=[...hiddenSolution].find(edge=>!active.has(edge)&&clueConflicts(new Set([...active,edge]),puzzle.clues)===0);if(safe)return setHint(safe,false);const towardCanonical=[...active].find(edge=>!hiddenSolution.has(edge));if(towardCanonical)return setHint(towardCanonical,true);return false;},solution(){if(complete)return;practice=true;solutionVisible=true;clearHint();render();onStatus('');},hideSolution(){if(complete)return;solutionVisible=false;clearHint();render();onStatus('');},previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:clueConflicts(active,puzzle.clues)*130,hintPenalty:hints*190});},getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,mistakePenalty:clueConflicts(active,puzzle.clues)*130,hintPenalty:hints*190}),metadata:{edges:active.size,conflicts:clueConflicts(active,puzzle.clues),clues:puzzle.clues.length,size,actual_edges:[...active],complexity:puzzle.quality?.score||0}};},destroy(){clearHint();host.classList.remove('game-solved-bloom');}};
}
