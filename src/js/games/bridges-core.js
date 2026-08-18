import {rngFromSeed,shuffle} from './utils.js';

const LEVELS={
  easy:{size:7,islands:[7,9],extraCandidates:0,extraSolution:0,attempts:220,minCycles:0,minSolutionCycles:0,minAttempts:0,poolTarget:1},
  medium:{size:9,islands:[12,15],extraCandidates:6,extraSolution:2,attempts:520,minCycles:2,minSolutionCycles:1,minAttempts:120,poolTarget:5},
  hard:{size:11,islands:[18,22],extraCandidates:10,extraSolution:3,attempts:780,minCycles:4,minSolutionCycles:2,minAttempts:180,poolTarget:6}
};
const PUZZLE_CACHE=new WeakMap();
const keyOf=(r,c)=>`${r}:${c}`;
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;

function normalizeIslands(islands){return islands.map((island,index)=>({id:index,row:Number(island.row),col:Number(island.col),clue:Number(island.clue||0)}));}
export function buildVisibilityEdges(islands){
  const list=normalizeIslands(islands),byRow=new Map(),byCol=new Map(),edges=[];
  for(const island of list){
    if(!byRow.has(island.row))byRow.set(island.row,[]);
    if(!byCol.has(island.col))byCol.set(island.col,[]);
    byRow.get(island.row).push(island);byCol.get(island.col).push(island);
  }
  const add=(a,b,orientation)=>edges.push({id:edges.length,a:a.id,b:b.id,orientation});
  for(const row of byRow.values()){row.sort((a,b)=>a.col-b.col);for(let i=1;i<row.length;i++)add(row[i-1],row[i],'h');}
  for(const col of byCol.values()){col.sort((a,b)=>a.row-b.row);for(let i=1;i<col.length;i++)add(col[i-1],col[i],'v');}
  return edges;
}
function edgeGeometry(edge,islands){
  const a=islands[edge.a],b=islands[edge.b];
  return edge.orientation==='h'
    ?{orientation:'h',fixed:a.row,min:Math.min(a.col,b.col),max:Math.max(a.col,b.col)}
    :{orientation:'v',fixed:a.col,min:Math.min(a.row,b.row),max:Math.max(a.row,b.row)};
}
export function edgesCross(edgeA,edgeB,islands){
  if(edgeA.orientation===edgeB.orientation)return false;
  const h=edgeA.orientation==='h'?edgeA:edgeB,v=edgeA.orientation==='v'?edgeA:edgeB,hg=edgeGeometry(h,islands),vg=edgeGeometry(v,islands);
  const crosses=vg.fixed>hg.min&&vg.fixed<hg.max&&hg.fixed>vg.min&&hg.fixed<vg.max;
  if(!crosses)return false;
  const point=keyOf(hg.fixed,vg.fixed);
  return !islands.some(island=>keyOf(island.row,island.col)===point);
}
function mapsFor(puzzle){
  const cached=PUZZLE_CACHE.get(puzzle);if(cached)return cached;
  const incident=puzzle.islands.map(()=>[]),crossings=puzzle.edges.map(()=>[]);
  puzzle.edges.forEach((edge,index)=>{incident[edge.a].push(index);incident[edge.b].push(index);});
  for(let i=0;i<puzzle.edges.length;i++)for(let j=i+1;j<puzzle.edges.length;j++)if(edgesCross(puzzle.edges[i],puzzle.edges[j],puzzle.islands)){crossings[i].push(j);crossings[j].push(i);}
  const value={incident,crossings};PUZZLE_CACHE.set(puzzle,value);return value;
}
export function bridgeNetworkComponents(puzzle,counts){
  if(!puzzle.islands.length)return[];
  const adj=puzzle.islands.map(()=>[]);
  puzzle.edges.forEach((edge,index)=>{if(Number(counts[index])>0){adj[edge.a].push(edge.b);adj[edge.b].push(edge.a);}});
  const seen=new Set(),components=[];
  for(let start=0;start<puzzle.islands.length;start++){
    if(seen.has(start))continue;
    const component=[],queue=[start];seen.add(start);
    while(queue.length){const node=queue.shift();component.push(node);for(const next of adj[node])if(!seen.has(next)){seen.add(next);queue.push(next);}}
    components.push(component);
  }
  return components;
}
export function connectedByBridges(puzzle,counts){return bridgeNetworkComponents(puzzle,counts).length===1;}
export function islandBridgeCounts(puzzle,counts){
  const totals=Array(puzzle.islands.length).fill(0);
  puzzle.edges.forEach((edge,index)=>{const value=Number(counts[index]||0);totals[edge.a]+=value;totals[edge.b]+=value;});
  return totals;
}
export function validateBridgesState(puzzle,counts,{complete=false}={}){
  if(!puzzle||!Array.isArray(puzzle.islands)||!Array.isArray(puzzle.edges)||!Array.isArray(counts)||counts.length!==puzzle.edges.length)return{ok:false,reason:'Malformed bridge state.'};
  if(counts.some(value=>!Number.isInteger(Number(value))||Number(value)<0||Number(value)>2))return{ok:false,reason:'A pair of islands can have at most two bridges.'};
  const totals=islandBridgeCounts(puzzle,counts),{crossings}=mapsFor(puzzle);
  for(let i=0;i<totals.length;i++)if(totals[i]>puzzle.islands[i].clue)return{ok:false,reason:`Island ${puzzle.islands[i].clue} would have too many bridges.`,island:i};
  for(let i=0;i<counts.length;i++)if(Number(counts[i])>0)for(const other of crossings[i])if(Number(counts[other])>0)return{ok:false,reason:'Bridges cannot cross.',edge:i,other};
  if(!complete)return{ok:true,totals};
  for(let i=0;i<totals.length;i++)if(totals[i]!==puzzle.islands[i].clue)return{ok:false,reason:'Every island number must be matched exactly.',island:i};
  if(!connectedByBridges(puzzle,counts))return{ok:false,reason:'All islands must belong to one connected network.'};
  return{ok:true,totals};
}
function solveInternal(puzzle,fixedCounts=null,limit=1){
  const {incident,crossings}=mapsFor(puzzle),assigned=Array(puzzle.edges.length).fill(-1),solutions=[];let nodes=0,maxDepth=0,branchNodes=0,rootForced=0;
  if(fixedCounts){for(let i=0;i<assigned.length;i++){const value=fixedCounts[i];if(value==null||value===-1)continue;if(!Number.isInteger(Number(value))||Number(value)<0||Number(value)>2)return{solutions:[],nodes,maxDepth,branchNodes,rootForced};assigned[i]=Number(value);}}
  const canSet=(edgeIndex,value)=>{
    const edge=puzzle.edges[edgeIndex];
    if(value>0&&crossings[edgeIndex].some(other=>assigned[other]>0))return false;
    for(const islandIndex of[edge.a,edge.b]){
      const clue=puzzle.islands[islandIndex].clue;let sum=0,unknown=0;
      for(const i of incident[islandIndex]){const v=i===edgeIndex?value:assigned[i];if(v<0)unknown++;else sum+=v;}
      if(sum>clue||sum+unknown*2<clue)return false;
    }
    return true;
  };
  const assignValue=(edgeIndex,value,changes)=>{if(assigned[edgeIndex]>=0)return assigned[edgeIndex]===value;if(!canSet(edgeIndex,value))return false;assigned[edgeIndex]=value;changes.push(edgeIndex);return true;};
  const propagate=()=>{
    const changes=[];let progress=true;
    while(progress){
      progress=false;
      for(let islandIndex=0;islandIndex<puzzle.islands.length;islandIndex++){
        const clue=puzzle.islands[islandIndex].clue,unknown=[];let sum=0;
        for(const i of incident[islandIndex]){if(assigned[i]<0)unknown.push(i);else sum+=assigned[i];}
        const need=clue-sum;
        if(need<0||need>unknown.length*2){for(const i of changes)assigned[i]=-1;return null;}
        if(!unknown.length)continue;
        if(need===0||need===unknown.length*2||unknown.length===1){
          const forced=unknown.length===1?need:(need===0?0:2);
          for(const edgeIndex of unknown){if(!assignValue(edgeIndex,forced,changes)){for(const i of changes)assigned[i]=-1;return null;}progress=true;}
        }
      }
      for(let i=0;i<assigned.length;i++)if(assigned[i]>0){for(const other of crossings[i])if(assigned[other]<0){if(!assignValue(other,0,changes)){for(const x of changes)assigned[x]=-1;return null;}progress=true;}else if(assigned[other]>0){for(const x of changes)assigned[x]=-1;return null;}}
    }
    return changes;
  };
  const dfs=(depth=0)=>{
    if(solutions.length>=limit)return;nodes++;maxDepth=Math.max(maxDepth,depth);
    const propagated=propagate();if(propagated==null)return;if(depth===0)rootForced=Math.max(rootForced,propagated.length);
    let next=-1,bestValues=null;
    for(let i=0;i<assigned.length;i++)if(assigned[i]<0){
      const values=[0,1,2].filter(value=>canSet(i,value));
      if(!values.length){for(const x of propagated)assigned[x]=-1;return;}
      if(!bestValues||values.length<bestValues.length){next=i;bestValues=values;if(values.length===1)break;}
    }
    if(next<0){const candidate=assigned.slice();if(validateBridgesState(puzzle,candidate,{complete:true}).ok)solutions.push(candidate);for(const x of propagated)assigned[x]=-1;return;}
    if(bestValues.length>1)branchNodes++;
    for(const value of bestValues.sort((a,b)=>Math.abs(1-a)-Math.abs(1-b))){if(!canSet(next,value))continue;assigned[next]=value;dfs(depth+1);assigned[next]=-1;if(solutions.length>=limit)break;}
    for(const x of propagated)assigned[x]=-1;
  };
  dfs();return{solutions,nodes,maxDepth,branchNodes,rootForced};
}
export function solveBridges(puzzle,fixedCounts=null){return solveInternal(puzzle,fixedCounts,1).solutions[0]||null;}
export function countBridgesSolutions(puzzle,limit=2){return solveInternal(puzzle,null,limit).solutions.length;}
export function analyzeBridgesPuzzle(puzzle){
  const result=solveInternal(puzzle,null,2),{incident,crossings}=mapsFor(puzzle),cycles=Math.max(0,puzzle.edges.length-puzzle.islands.length+1),doubleBridges=puzzle.solution?.filter(value=>value===2).length||0,activeLinks=puzzle.solution?.filter(value=>value>0).length||0;
  const degrees=incident.map(edges=>edges.length),branchingIslands=degrees.filter(value=>value>=3).length,crossingPairs=crossings.reduce((sum,list)=>sum+list.length,0)/2,maxDegree=Math.max(0,...degrees),leafIslands=degrees.filter(value=>value===1).length,lowDegreeIslands=degrees.filter(value=>value<=2).length,total=Math.max(1,puzzle.islands.length),solutionCycles=Math.max(0,activeLinks-puzzle.islands.length+1);
  return{solutions:result.solutions.length,searchNodes:result.nodes,solverDepth:result.maxDepth,branchNodes:result.branchNodes,rootForced:result.rootForced,forcedRatio:puzzle.edges.length?result.rootForced/puzzle.edges.length:1,cycles,solutionCycles,doubleBridges,candidateEdges:puzzle.edges.length,branchingIslands,crossingPairs,maxDegree,leafIslands,leafRatio:leafIslands/total,lowDegreeIslands,lowDegreeRatio:lowDegreeIslands/total};
}
function candidateGraphConnected(islands,edges){
  if(!islands.length)return false;const adj=islands.map(()=>[]);edges.forEach(edge=>{adj[edge.a].push(edge.b);adj[edge.b].push(edge.a);});
  const seen=new Set([0]),queue=[0];while(queue.length){const n=queue.shift();for(const x of adj[n])if(!seen.has(x)){seen.add(x);queue.push(x);}}return seen.size===islands.length;
}
function randomPositions(size,count,rng,extraCandidates,minCycles=0){
  const positions=[],occupied=new Set(),first={row:1+Math.floor(rng()*(size-2)),col:1+Math.floor(rng()*(size-2))};positions.push(first);occupied.add(keyOf(first.row,first.col));let guard=0;
  while(positions.length<count&&guard++<7000){
    const parent=positions[Math.floor(rng()*positions.length)],horizontal=rng()<.5,row=horizontal?parent.row:Math.floor(rng()*size),col=horizontal?Math.floor(rng()*size):parent.col,key=keyOf(row,col);
    if(occupied.has(key))continue;
    const next=[...positions,{row,col}],edges=buildVisibilityEdges(next.map(p=>({...p,clue:0}))),maxEdges=(next.length-1)+extraCandidates;
    if(edges.length>maxEdges||!candidateGraphConnected(next,edges))continue;
    positions.push({row,col});occupied.add(key);
  }
  if(positions.length!==count)return null;
  const edges=buildVisibilityEdges(positions.map(p=>({...p,clue:0}))),cycles=Math.max(0,edges.length-positions.length+1);
  return cycles>=minCycles?positions:null;
}
function planarSpanningTree(islands,edges,rng){
  const parent=islands.map((_,i)=>i),find=x=>parent[x]===x?x:(parent[x]=find(parent[x])),selected=[];
  for(const edge of shuffle(edges,rng)){const a=find(edge.a),b=find(edge.b);if(a===b)continue;if(selected.some(other=>edgesCross(edge,other,islands)))continue;parent[a]=b;selected.push(edge);}
  return selected.length===islands.length-1?selected:null;
}
function buildPuzzleFromPositions(size,difficulty,positions,rng,cfg,seed){
  const islands=positions.map((p,id)=>({id,...p,clue:0})),edges=buildVisibilityEdges(islands);if(!candidateGraphConnected(islands,edges))return null;
  const tree=planarSpanningTree(islands,edges,rng);if(!tree)return null;
  const selected=new Map();for(const edge of tree)selected.set(edgeKey(edge.a,edge.b),rng()<.32?2:1);
  if(cfg.extraSolution){
    let added=0;
    for(const edge of shuffle(edges.filter(edge=>!selected.has(edgeKey(edge.a,edge.b))),rng)){
      if(added>=cfg.extraSolution)break;
      const active=edges.filter(candidate=>selected.has(edgeKey(candidate.a,candidate.b)));
      if(active.some(other=>edgesCross(edge,other,islands)))continue;
      selected.set(edgeKey(edge.a,edge.b),rng()<.28?2:1);added++;
    }
  }
  const solution=edges.map(edge=>selected.get(edgeKey(edge.a,edge.b))||0),clues=Array(islands.length).fill(0);
  edges.forEach((edge,i)=>{clues[edge.a]+=solution[i];clues[edge.b]+=solution[i];});
  if(clues.some(clue=>clue<1||clue>8))return null;
  islands.forEach((island,i)=>island.clue=clues[i]);
  const puzzle={size,difficulty,seed,islands,edges,solution};if(!validateBridgesState(puzzle,solution,{complete:true}).ok)return null;
  const analysis=analyzeBridgesPuzzle(puzzle);if(analysis.solutions!==1||analysis.solutionCycles<cfg.minSolutionCycles)return null;puzzle.quality=analysis;return puzzle;
}
function fallbackTreePuzzle(difficulty,seed,cfg,rng){
  for(let count=cfg.islands[0];count<=cfg.islands[1];count++)for(let attempt=0;attempt<220;attempt++){
    const positions=randomPositions(cfg.size,count,rng,0,0);if(!positions)continue;
    const puzzle=buildPuzzleFromPositions(cfg.size,difficulty,positions,rng,{...cfg,extraSolution:0,minSolutionCycles:0},seed);if(puzzle)return puzzle;
  }
  throw new Error(`Unable to generate Bridges puzzle for ${difficulty}.`);
}
function difficultyScore(puzzle){
  const q=puzzle.quality;
  return q.cycles*70+q.solutionCycles*110+q.branchingIslands*34+q.crossingPairs*52+q.maxDegree*18+q.doubleBridges*8+Math.min(q.searchNodes,500)*1.1+q.solverDepth*38+q.branchNodes*24-q.leafRatio*190-q.lowDegreeRatio*110-q.forcedRatio*150+puzzle.islands.length*4;
}
function qualifiesDifficulty(difficulty,q){
  if(difficulty==='easy')return q.cycles===0&&q.crossingPairs===0;
  if(difficulty==='medium')return q.cycles>=2&&q.solutionCycles>=1&&q.branchingIslands>=3&&(q.crossingPairs>=1||q.maxDegree>=4)&&q.leafRatio<=.52&&q.lowDegreeRatio<=.90&&q.searchNodes>=4;
  return q.cycles>=4&&q.solutionCycles>=2&&q.branchingIslands>=5&&q.crossingPairs>=2&&q.maxDegree>=4&&q.leafRatio<=.45&&q.lowDegreeRatio<=.82&&(q.solverDepth>=2||q.branchNodes>=2||q.searchNodes>=14);
}
export function generateBridges(difficulty='easy',seed='bridges:easy:seed'){
  const cfg=LEVELS[difficulty]||LEVELS.easy,rng=rngFromSeed(`${seed}:bridges:v3`),min=cfg.islands[0],max=cfg.islands[1],qualified=[];let best=null;
  for(let attempt=0;attempt<cfg.attempts;attempt++){
    const count=min+Math.floor(rng()*(max-min+1)),positions=randomPositions(cfg.size,count,rng,cfg.extraCandidates,cfg.minCycles);if(!positions)continue;
    const puzzle=buildPuzzleFromPositions(cfg.size,difficulty,positions,rng,cfg,seed);if(!puzzle)continue;
    const score=difficultyScore(puzzle);puzzle.quality.score=score;if(!best||score>best.score)best={puzzle,score};
    if(qualifiesDifficulty(difficulty,puzzle.quality))qualified.push({puzzle,score});
    if(difficulty==='easy'&&qualified.length)return qualified[0].puzzle;
    if(attempt+1>=cfg.minAttempts&&qualified.length>=cfg.poolTarget)break;
  }
  if(qualified.length)return qualified.sort((a,b)=>b.score-a.score)[0].puzzle;
  if(best)return best.puzzle;
  if(difficulty==='easy')return fallbackTreePuzzle(difficulty,seed,cfg,rng);
  throw new Error(`Unable to generate a quality-gated Bridges ${difficulty} puzzle.`);
}
export function edgeIndexBetween(puzzle,a,b){const key=edgeKey(Number(a),Number(b));return puzzle.edges.findIndex(edge=>edgeKey(edge.a,edge.b)===key);}
function addCapacity(puzzle,counts,edgeIndex,totals,{crossings}){
  const edge=puzzle.edges[edgeIndex],current=Number(counts[edgeIndex]||0);if(current>=2)return 0;
  if(current===0&&crossings[edgeIndex].some(other=>Number(counts[other]||0)>0))return 0;
  const remainingA=puzzle.islands[edge.a].clue-totals[edge.a],remainingB=puzzle.islands[edge.b].clue-totals[edge.b];
  return Math.max(0,Math.min(2-current,remainingA,remainingB));
}
function correctionHint(puzzle,counts,solution,allMatched,networkCount){
  for(let i=0;i<puzzle.edges.length;i++){
    const current=Number(counts[i]||0),target=Number(solution[i]||0);if(current<=target)continue;
    return{kind:'correction',edgeIndex:i,target,action:'reduce',title:allMatched&&networkCount>1?'Reconnect the network':'Reduce this connection',message:allMatched&&networkCount>1?`All numbers match, but the board is split into ${networkCount} groups. The highlighted bridge is locking the wrong connection in place, so reduce it before reconnecting the groups.`:'The highlighted connection has more bridges than the unique valid network allows. Reduce it, then use the freed bridge count elsewhere.'};
  }
  return null;
}
function forcedLocalHint(puzzle,counts,solution){
  const totals=islandBridgeCounts(puzzle,counts),maps=mapsFor(puzzle),candidates=[];
  for(let islandIndex=0;islandIndex<puzzle.islands.length;islandIndex++){
    const island=puzzle.islands[islandIndex],remaining=island.clue-totals[islandIndex];if(remaining<=0)continue;
    const available=maps.incident[islandIndex].map(edgeIndex=>({edgeIndex,capacity:addCapacity(puzzle,counts,edgeIndex,totals,maps)})).filter(item=>item.capacity>0),totalCapacity=available.reduce((sum,item)=>sum+item.capacity,0);
    for(const item of available){
      const forcedAdd=Math.max(0,remaining-(totalCapacity-item.capacity));if(!forcedAdd)continue;
      const current=Number(counts[item.edgeIndex]||0),target=Math.min(Number(solution[item.edgeIndex]||2),current+forcedAdd);if(target<=current)continue;
      const onlyDirection=available.length===1,title=onlyDirection?'Only one route can finish this island':forcedAdd>=2?'A double bridge is forced':'This bridge is forced';
      const message=onlyDirection?`The highlighted island still needs ${remaining} ${remaining===1?'bridge':'bridges'}, and the green connection is its only remaining route.`:`The highlighted island still needs ${remaining}. Its other available routes can supply at most ${totalCapacity-item.capacity}, so the green connection must carry at least ${forcedAdd} more ${forcedAdd===1?'bridge':'bridges'}.`;
      candidates.push({kind:'forced',edgeIndex:item.edgeIndex,target,action:'add',title,message,weight:forcedAdd*10+(onlyDirection?8:0)+(target===2?3:0)});
    }
  }
  return candidates.sort((a,b)=>b.weight-a.weight)[0]||null;
}
export function explainBridgesHint(puzzle,counts,solution=puzzle.solution){
  const validity=validateBridgesState(puzzle,counts);if(!validity.ok)return null;
  const totals=validity.totals,components=bridgeNetworkComponents(puzzle,counts),allMatched=totals.every((value,index)=>value===puzzle.islands[index].clue),correction=correctionHint(puzzle,counts,solution,allMatched,components.length);
  if(correction)return correction;
  const forced=forcedLocalHint(puzzle,counts,solution);if(forced)return forced;
  for(let i=0;i<puzzle.edges.length;i++){
    const current=Number(counts[i]||0),goal=Number(solution[i]||0);if(current>=goal)continue;
    return{kind:'solver',edgeIndex:i,target:current+1,action:'add',title:'Safe next connection',message:'Add one bridge on the highlighted green connection. This keeps the board compatible with the unique solution and preserves a single final network.'};
  }
  return null;
}
