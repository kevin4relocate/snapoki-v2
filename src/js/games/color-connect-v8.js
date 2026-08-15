import {
  deterministicHamiltonianPath,
  blockedLayoutStats,
  openRegionStats,
  pathTurns,
  rngFromSeed,
  shuffle,
  rcOf,
  orthogonalNeighbors,
  areAdjacent,
  scoreFromPerformance,
  scoreTimeDivisor
} from './utils.js';

const LEVEL={
  easy:{size:6,colors:4,blockedRuns:[],candidates:12,maxCandidates:16,pathFlips:44,weaveAttempts:14,minRoute:5,splitAttempts:1,shortlist:3,variants:6,variantSlack:4,nodeLimit:700,solutionLimit:2},
  medium:{size:9,colors:7,blockedRuns:[4,3,3,2,2,1,1],candidates:14,maxCandidates:24,pathFlips:84,weaveAttempts:25,minRoute:5,splitAttempts:6,shortlist:4,variants:9,variantSlack:7,nodeLimit:2200,solutionLimit:2},
  hard:{size:12,colors:10,blockedRuns:[7,5,5,4,4,3,3,2,2,1],candidates:16,maxCandidates:30,pathFlips:128,weaveAttempts:38,minRoute:6,splitAttempts:8,shortlist:5,variants:12,variantSlack:11,nodeLimit:5200,solutionLimit:2}
};

const COLORS=['#ff5d8f','#52d273','#5ca8ff','#ffb347','#b879ff','#39d0d8','#ff7c54','#e7e25a','#8b9cff','#f0a3ff'];
const NAMES=['pink','green','blue','orange','purple','cyan','coral','yellow','indigo','orchid'];

function clusterStats(blocked,size){
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
  return{clusterCount:sizes.length,clusterSizes:sizes,majorClusters:sizes.filter(value=>value>=3).length,sizeKinds:new Set(sizes.map(value=>value===1?'single':value===2?'pair':value<=4?'small':'large')).size};
}

function validPath(path,size){return path.length>1&&new Set(path).size===path.length&&path.every((node,i)=>i===0||areAdjacent(path[i-1],node,size));}

function randomizeHamiltonianPath(size,seed,flips){
  const rng=rngFromSeed(`${seed}:ham-v8`),path=deterministicHamiltonianPath(size,`${seed}:base-v8`);
  for(let round=0;round<flips;round++){
    let changed=false;
    for(let attempt=0;attempt<120;attempt++){
      let i=Math.floor(rng()*(path.length-3)),j=i+2+Math.floor(rng()*Math.max(1,path.length-i-3));
      if(j>=path.length-1)j=path.length-2;
      if(areAdjacent(path[i],path[j],size)&&areAdjacent(path[i+1],path[j+1],size)){
        const middle=path.slice(i+1,j+1).reverse();path.splice(i+1,middle.length,...middle);changed=true;break;
      }
    }
    if(!changed&&round>flips*.62)break;
  }
  return path;
}

function balancedLengths(total,count,minLength,rng){
  const lengths=Array(count).fill(minLength);let remaining=total-minLength*count;
  if(remaining<0)return null;
  while(remaining-->0){
    const choices=lengths.map((length,index)=>({index,score:rng()*2-length*.09})).sort((a,b)=>b.score-a.score);
    lengths[choices[0].index]++;
  }
  return lengths;
}

function buildSplit(path,cfg,seed,index,attempt){
  const rng=rngFromSeed(`${seed}:runs-v8:${index}:${attempt}`),blockedRuns=shuffle(cfg.blockedRuns,rng),blockedCount=blockedRuns.reduce((a,b)=>a+b,0),openCount=path.length-blockedCount,routeLengths=balancedLengths(openCount,cfg.colors,cfg.minRoute,rng);
  if(!routeLengths)return null;
  const routes=[],blocked=[];let cursor=0;
  for(let color=0;color<cfg.colors;color++){
    const length=routeLengths[color];routes.push(path.slice(cursor,cursor+length));cursor+=length;
    if(color<blockedRuns.length){const amount=blockedRuns[color];blocked.push(...path.slice(cursor,cursor+amount));cursor+=amount;}
  }
  if(cursor!==path.length||routes.some(route=>!validPath(route,cfg.size)))return null;
  const blocks=blockedLayoutStats(blocked,cfg.size),clusters=clusterStats(blocked,cfg.size),blockScore=blocks.isolated*210+clusters.clusterCount*150+clusters.majorClusters*80+clusters.sizeKinds*100+blocks.quadrants*100+(blocks.rowSpread+blocks.colSpread)*28-blocks.largestCluster*105-blocks.adjacentPairs*8;
  return{routes,blocked,blockScore,blocks,clusters};
}

function splitTacticalRuns(path,cfg,seed,index){
  let best=null;
  for(let attempt=0;attempt<cfg.splitAttempts;attempt++){
    const split=buildSplit(path,cfg,seed,index,attempt);
    if(split&&(!best||split.blockScore>best.blockScore))best=split;
  }
  return best;
}

function weaveOptions(routes,size,minRoute){
  const options=[];
  for(let a=0;a<routes.length;a++)for(let b=a+1;b<routes.length;b++){
    const A=routes[a],B=routes[b];
    for(let i=0;i<A.length-1;i++)for(let j=0;j<B.length-1;j++){
      if(areAdjacent(A[i],B[j],size)&&areAdjacent(A[i+1],B[j+1],size)){
        const nextA=A.slice(0,i+1).concat(B.slice(0,j+1).reverse()),nextB=A.slice(i+1).reverse().concat(B.slice(j+1));
        if(nextA.length>=minRoute&&nextB.length>=minRoute&&validPath(nextA,size)&&validPath(nextB,size))options.push({a,b,nextA,nextB});
      }
      if(areAdjacent(A[i],B[j+1],size)&&areAdjacent(A[i+1],B[j],size)){
        const nextA=A.slice(0,i+1).concat(B.slice(j+1)),nextB=B.slice(0,j+1).concat(A.slice(i+1));
        if(nextA.length>=minRoute&&nextB.length>=minRoute&&validPath(nextA,size)&&validPath(nextB,size))options.push({a,b,nextA,nextB});
      }
    }
  }
  return options;
}

function routeLocalScore(route,size){
  const turns=pathTurns(route,size),[aR,aC]=rcOf(route[0],size),[bR,bC]=rcOf(route.at(-1),size),manhattan=Math.abs(aR-bR)+Math.abs(aC-bC),detour=Math.max(0,route.length-1-manhattan),zones=new Set(route.map(index=>{const[r,c]=rcOf(index,size);return `${Math.min(2,Math.floor(r*3/size))}:${Math.min(2,Math.floor(c*3/size))}`;}));
  return turns*18+detour*9+zones.size*24-(aR===bR||aC===bC?24:0);
}

function topologyProxy(routes,size){
  const owner=new Map(),zoneColors=Array.from({length:9},()=>new Set()),routeZones=Array.from({length:routes.length},()=>new Set()),neighbors=Array.from({length:routes.length},()=>new Set());
  routes.forEach((route,color)=>route.forEach(index=>{owner.set(index,color);const[r,c]=rcOf(index,size),zone=Math.min(2,Math.floor(r*3/size))*3+Math.min(2,Math.floor(c*3/size));zoneColors[zone].add(color);routeZones[color].add(zone);}));
  for(const[index,color]of owner)for(const next of orthogonalNeighbors(index,size,size)){const other=owner.get(next);if(other!=null&&other!==color){neighbors[color].add(other);neighbors[other].add(color);}}
  const mixed=zoneColors.filter(set=>set.size>=2).length,hot=zoneColors.filter(set=>set.size>=3).length,minNeighbors=Math.min(...neighbors.map(set=>set.size)),avgZones=routeZones.reduce((sum,set)=>sum+set.size,0)/routes.length;
  return routes.reduce((sum,route)=>sum+routeLocalScore(route,size),0)+mixed*90+hot*120+minNeighbors*160+avgZones*90;
}

function weaveRoutes(input,size,seed,attempts,minRoute){
  const rng=rngFromSeed(`${seed}:weave-v8`),routes=input.map(route=>[...route]);let weaves=0,currentScore=topologyProxy(routes,size);
  for(let round=0;round<attempts;round++){
    const options=weaveOptions(routes,size,minRoute);if(!options.length)break;
    const sample=shuffle(options,rng).slice(0,Math.min(14,options.length));let best=null;
    for(const option of sample){
      const next=routes.map(route=>route);next[option.a]=option.nextA;next[option.b]=option.nextB;
      const score=topologyProxy(next,size)+rng()*6;
      if(!best||score>best.score)best={...option,score};
    }
    if(!best)break;
    if(best.score<currentScore-8&&round>attempts*.4)break;
    routes[best.a]=best.nextA;routes[best.b]=best.nextB;currentScore=best.score;weaves++;
  }
  return{routes,weaves};
}

function makeSegments(paths,seed){
  const rng=rngFromSeed(`${seed}:colors-v8`),ordered=shuffle(paths,rng);
  return ordered.map((path,i)=>({color:COLORS[i],name:NAMES[i],path,start:path[0],end:path.at(-1)}));
}

function interactionStats(segments,size,blocked){
  const owner=new Map(),routeNeighbors=Array.from({length:segments.length},()=>new Set()),zoneColors=Array.from({length:9},()=>new Set()),routeZones=Array.from({length:segments.length},()=>new Set()),boxes=[];
  segments.forEach((segment,color)=>{
    let minR=size,maxR=0,minC=size,maxC=0;
    for(const index of segment.path){
      owner.set(index,color);const[r,c]=rcOf(index,size),zone=Math.min(2,Math.floor(r*3/size))*3+Math.min(2,Math.floor(c*3/size));zoneColors[zone].add(color);routeZones[color].add(zone);minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);
    }
    boxes.push({minR,maxR,minC,maxC});
  });
  let crossEdges=0,endpointNearPairs=0,boxOverlapPairs=0,endpointBoxIntrusions=0;
  for(const[index,color]of owner)for(const next of orthogonalNeighbors(index,size,size)){
    const other=owner.get(next);if(other!=null&&other!==color){routeNeighbors[color].add(other);routeNeighbors[other].add(color);if(next>index)crossEdges++;}
  }
  const endpoints=segments.flatMap((segment,color)=>[{index:segment.start,color},{index:segment.end,color}]);
  for(let i=0;i<endpoints.length;i++)for(let j=i+1;j<endpoints.length;j++)if(endpoints[i].color!==endpoints[j].color){const[aR,aC]=rcOf(endpoints[i].index,size),[bR,bC]=rcOf(endpoints[j].index,size);if(Math.abs(aR-bR)+Math.abs(aC-bC)<=3)endpointNearPairs++;}
  for(let a=0;a<boxes.length;a++){
    const box=boxes[a];
    for(let b=a+1;b<boxes.length;b++){const other=boxes[b];if(Math.max(box.minR,other.minR)<=Math.min(box.maxR,other.maxR)&&Math.max(box.minC,other.minC)<=Math.min(box.maxC,other.maxC))boxOverlapPairs++;}
    for(let b=0;b<segments.length;b++)if(a!==b)for(const endpoint of[segments[b].start,segments[b].end]){const[r,c]=rcOf(endpoint,size);if(r>=box.minR&&r<=box.maxR&&c>=box.minC&&c<=box.maxC)endpointBoxIntrusions++;}
  }
  const componentCount=()=>{const seen=new Set();let components=0;for(let start=0;start<routeNeighbors.length;start++){if(seen.has(start))continue;components++;const queue=[start];seen.add(start);while(queue.length){const current=queue.shift();for(const next of routeNeighbors[current])if(!seen.has(next)){seen.add(next);queue.push(next);}}}return components;};
  const routeTurns=segments.map(segment=>pathTurns(segment.path,size)),detours=segments.map(segment=>{const[aR,aC]=rcOf(segment.start,size),[bR,bC]=rcOf(segment.end,size);return Math.max(0,segment.path.length-1-(Math.abs(aR-bR)+Math.abs(aC-bC)));});
  return{
    owner,
    routeGraphComponents:componentCount(),
    minNeighborColors:Math.min(...routeNeighbors.map(set=>set.size)),
    competitiveRoutes:routeNeighbors.filter(set=>set.size>=2).length,
    crossEdges,
    mixedZones:zoneColors.filter(set=>set.size>=2).length,
    hotZones:zoneColors.filter(set=>set.size>=3).length,
    avgRouteZones:routeZones.reduce((sum,set)=>sum+set.size,0)/segments.length,
    endpointNearPairs,
    endpointBoxIntrusions,
    boxOverlapPairs,
    turns:routeTurns.reduce((a,b)=>a+b,0),
    avgTurns:routeTurns.reduce((a,b)=>a+b,0)/segments.length,
    straightRoutes:routeTurns.filter(value=>value<=1).length,
    lowTurnRoutes:routeTurns.filter(value=>value<=2).length,
    avgDetour:detours.reduce((a,b)=>a+b,0)/segments.length,
    blocks:blockedLayoutStats(blocked,size),
    clusters:clusterStats(blocked,size),
    graph:openRegionStats([...owner.keys()],size)
  };
}

function cheapGate(difficulty,q){
  if(difficulty==='easy')return q.straightRoutes<=1&&q.avgTurns>=1.6;
  if(difficulty==='medium')return q.routeGraphComponents===1&&q.mixedZones>=5&&q.avgRouteZones>=2.4&&q.avgTurns>=2.5&&q.straightRoutes<=1&&q.blocks.quadrants>=3&&q.blocks.rowSpread>=6&&q.blocks.colSpread>=6&&q.blocks.largestCluster<=9;
  return q.routeGraphComponents===1&&q.mixedZones>=7&&q.hotZones>=4&&q.avgRouteZones>=2.7&&q.avgTurns>=3&&q.straightRoutes<=1&&q.competitiveRoutes>=8&&q.boxOverlapPairs>=7&&q.endpointNearPairs>=10&&q.blocks.quadrants===4&&q.blocks.rowSpread>=9&&q.blocks.colSpread>=9&&q.blocks.largestCluster<=12;
}

function cheapScore(q,weaves){
  return q.crossEdges*18+q.mixedZones*180+q.hotZones*220+q.avgRouteZones*180+q.endpointNearPairs*55+q.endpointBoxIntrusions*65+q.boxOverlapPairs*80+q.minNeighborColors*210+q.avgTurns*160+q.avgDetour*90+q.blocks.isolated*70+q.clusters.clusterCount*45+weaves*10-q.straightRoutes*500-q.blocks.largestCluster*35;
}

function candidateFor(cfg,seed,index,difficulty){
  const base=randomizeHamiltonianPath(cfg.size,`${seed}:candidate:${index}`,cfg.pathFlips),split=splitTacticalRuns(base,cfg,seed,index);if(!split)return null;
  const woven=weaveRoutes(split.routes,cfg.size,`${seed}:${index}`,cfg.weaveAttempts,cfg.minRoute),segments=makeSegments(woven.routes,`${seed}:${index}`),quality=interactionStats(segments,cfg.size,split.blocked);
  quality.cheapValid=cheapGate(difficulty,quality);quality.cheapScore=cheapScore(quality,woven.weaves);quality.weaves=woven.weaves;
  return{segments,blocked:split.blocked,openCount:segments.reduce((sum,segment)=>sum+segment.path.length,0),quality,weaves:woven.weaves};
}

function shortestGridPath(start,end,size,blocked,forbidden){
  const queue=[start],prev=new Map([[start,-1]]);
  while(queue.length){
    const current=queue.shift();if(current===end)break;
    for(const next of orthogonalNeighbors(current,size,size)){if(blocked.has(next)||forbidden.has(next)||prev.has(next))continue;prev.set(next,current);queue.push(next);}
  }
  if(!prev.has(end))return null;
  const path=[];for(let node=end;node!==-1;node=prev.get(node))path.push(node);return path.reverse();
}

function weightedGridPath(start,end,size,blocked,forbidden,seed,owner,color,trial){
  const rng=rngFromSeed(`${seed}:weighted:${color}:${trial}`),weights=Array.from({length:size*size},()=>1+rng()*2.1),dist=new Map([[start,0]]),prev=new Map(),open=[{index:start,cost:0}];
  while(open.length){
    open.sort((a,b)=>b.cost-a.cost);const current=open.pop();if(current.cost!==dist.get(current.index))continue;if(current.index===end)break;
    for(const next of orthogonalNeighbors(current.index,size,size)){
      if(blocked.has(next)||forbidden.has(next))continue;
      const foreign=owner.get(next),stealBias=trial%3===0&&foreign!=null&&foreign!==color?-.42:0,ownBias=trial%4===0&&foreign===color?.18:0,cost=current.cost+Math.max(.25,weights[next]+stealBias+ownBias);
      if(cost<(dist.get(next)??Infinity)){dist.set(next,cost);prev.set(next,current.index);open.push({index:next,cost});}
    }
  }
  if(!dist.has(end))return null;
  const path=[];let node=end;while(node!=null){path.push(node);if(node===start)break;node=prev.get(node);}return path.at(-1)===start?path.reverse():null;
}

function maskFor(path){let mask=0n;for(const index of path)mask|=1n<<BigInt(index);return mask;}

function buildVariants(puzzle,cfg,seed){
  const blocked=new Set(puzzle.blocked),endpointOwner=new Map(),owner=new Map();
  puzzle.segments.forEach((segment,color)=>{endpointOwner.set(segment.start,color);endpointOwner.set(segment.end,color);segment.path.forEach(index=>owner.set(index,color));});
  const variants=[];let temptingRoutes=0,shortcutVictimPairs=0,multiVictimTemptations=0;
  puzzle.segments.forEach((segment,color)=>{
    const forbidden=new Set([...endpointOwner].filter(([,other])=>other!==color).map(([index])=>index)),seen=new Set(),list=[];
    const add=(path,hidden=false)=>{if(!path||!validPath(path,puzzle.size))return;const key=path.join(',');if(seen.has(key))return;seen.add(key);list.push({path,mask:maskFor(path),hidden,length:path.length});};
    add(segment.path,true);
    const shortest=shortestGridPath(segment.start,segment.end,puzzle.size,blocked,forbidden);add(shortest,false);
    const shortestLen=shortest?.length||segment.path.length,maxLen=Math.max(segment.path.length+2,shortestLen+cfg.variantSlack);
    for(let trial=0;trial<cfg.variants*2&&list.length<cfg.variants;trial++){
      const path=weightedGridPath(segment.start,segment.end,puzzle.size,blocked,forbidden,seed,owner,color,trial);
      if(path&&path.length<=maxLen)add(path,false);
    }
    list.sort((a,b)=>a.length-b.length||Number(a.hidden)-Number(b.hidden));
    const greedy=list.find(item=>!item.hidden)||list[0],victims=new Set();
    if(greedy&&!greedy.hidden&&greedy.length<segment.path.length){for(const index of greedy.path){const foreign=owner.get(index);if(foreign!=null&&foreign!==color)victims.add(foreign);}if(victims.size){temptingRoutes++;shortcutVictimPairs+=victims.size;if(victims.size>=2)multiVictimTemptations++;}}
    variants.push(list);
  });
  return{variants,temptingRoutes,shortcutVictimPairs,multiVictimTemptations};
}

function evaluateSolverModel(puzzle,cfg,seed){
  const built=buildVariants(puzzle,cfg,seed),variantLists=built.variants,openMask=maskFor(puzzle.segments.flatMap(segment=>segment.path)),stats={nodes:0,backtracks:0,deadEnds:0,decisions:0,greedyTraps:0,maxDepth:0,solutions:0,aborted:false,variantTotal:variantLists.reduce((sum,list)=>sum+list.length,0),minVariants:Math.min(...variantLists.map(list=>list.length)),...built};
  const feasible=(color,occupied)=>variantLists[color].filter(item=>(item.mask&occupied)===0n);
  function search(remaining,occupied,depth){
    if(stats.solutions>=cfg.solutionLimit)return true;
    if(++stats.nodes>cfg.nodeLimit){stats.aborted=true;return false;}
    stats.maxDepth=Math.max(stats.maxDepth,depth);
    if(!remaining.length){if(occupied===openMask){stats.solutions++;return true;}stats.deadEnds++;return false;}
    let chosen=-1,options=null;
    for(const color of remaining){const list=feasible(color,occupied);if(!list.length){stats.deadEnds++;return false;}if(!options||list.length<options.length){chosen=color;options=list;if(list.length===1)break;}}
    if(options.length>1)stats.decisions++;
    const rest=remaining.filter(color=>color!==chosen);let firstSolved=false,greedyTrapCounted=false,anySolved=false;
    for(let i=0;i<options.length;i++){
      const option=options[i],nextOccupied=occupied|option.mask;let potential=nextOccupied,possible=true;
      for(const color of rest){const list=feasible(color,nextOccupied);if(!list.length){possible=false;break;}for(const candidate of list)potential|=candidate.mask;}
      if(!possible||potential!==openMask){stats.backtracks++;stats.deadEnds++;continue;}
      const before=stats.solutions,branchSolved=search(rest,nextOccupied,depth+1)||stats.solutions>before,actuallySolved=stats.solutions>before;
      if(i===0)firstSolved=actuallySolved;
      if(i>0&&!firstSolved&&actuallySolved&&!greedyTrapCounted){stats.greedyTraps++;greedyTrapCounted=true;}
      if(actuallySolved)anySolved=true;else stats.backtracks++;
      if(stats.solutions>=cfg.solutionLimit||stats.aborted)break;
      if(branchSolved)anySolved=true;
    }
    return anySolved;
  }
  search(Array.from({length:puzzle.segments.length},(_,i)=>i),0n,0);
  stats.uniqueModel=stats.solutions===1&&!stats.aborted;
  stats.score=stats.nodes+stats.backtracks*5+stats.deadEnds*7+stats.decisions*4+stats.greedyTraps*160+stats.temptingRoutes*95+stats.shortcutVictimPairs*70+stats.multiVictimTemptations*140+(stats.uniqueModel?300:0);
  return stats;
}

function solverGate(difficulty,s){
  if(difficulty==='easy')return s.solutions>=1;
  if(difficulty==='medium')return s.solutions>=1&&s.decisions>=2&&s.backtracks>=2&&s.deadEnds>=1&&s.temptingRoutes>=1;
  return s.solutions>=1&&s.uniqueModel&&s.nodes>=20&&s.decisions>=5&&s.backtracks>=7&&s.deadEnds>=4&&s.temptingRoutes>=2&&s.shortcutVictimPairs>=3&&s.multiVictimTemptations>=1;
}

export function colorConnectComplexity(puzzle){return puzzle.quality||{};}

export function generateColorConnect(difficulty='easy',seed='color-connect'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,cheap=[];
  for(let i=0;i<cfg.maxCandidates;i++){
    const candidate=candidateFor(cfg,seed,i,difficulty);if(candidate?.quality.cheapValid)cheap.push(candidate);
    if(i+1>=cfg.candidates&&cheap.length>=cfg.shortlist)break;
  }
  if(!cheap.length)throw new Error(`Unable to construct topology-gated ${difficulty} Color Connect V8 layout.`);
  cheap.sort((a,b)=>b.quality.cheapScore-a.quality.cheapScore);
  const finalists=cheap.slice(0,cfg.shortlist),evaluated=[];
  for(let i=0;i<finalists.length;i++){
    const candidate=finalists[i],solver=evaluateSolverModel({...candidate,size:cfg.size},cfg,`${seed}:solver:${i}`);candidate.quality={...candidate.quality,solver,tacticalValid:solverGate(difficulty,solver),score:candidate.quality.cheapScore+solver.score*4};evaluated.push(candidate);
  }
  const valid=evaluated.filter(candidate=>candidate.quality.tacticalValid),pool=valid.length?valid:evaluated;
  pool.sort((a,b)=>b.quality.score-a.quality.score);const chosen=pool[0];
  if(difficulty==='hard'&&!chosen.quality.tacticalValid)throw new Error('Unable to construct solver-verified Hard Color Connect V8 layout.');
  return{size:cfg.size,segments:chosen.segments,blocked:chosen.blocked,openCount:chosen.openCount,quality:chosen.quality,weaves:chosen.weaves,seed,difficulty,version:8};
}

function polylinePoints(path,size){return path.map(index=>{const[r,c]=rcOf(index,size);return `${c+.5},${r+.5}`;}).join(' ');}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateColorConnect(difficulty,seed),endpoint=new Map(),blocked=new Set(puzzle.blocked),timeDivisor=scoreTimeDivisor('color-connect',difficulty);
  puzzle.segments.forEach((segment,i)=>{endpoint.set(segment.start,i);endpoint.set(segment.end,i);});
  let paths=new Map(),activeColor=null,redraws=0,hintedCells=new Set(),solutionVisible=false,practice=false,complete=false,drag=null,hintUses=0;
  host.innerHTML=`<div class="color-board-wrap"><div class="color-grid" style="--grid-size:${puzzle.size}" aria-label="Color Connect board"></div><svg class="color-lines" viewBox="0 0 ${puzzle.size} ${puzzle.size}" aria-hidden="true"></svg></div>`;
  const grid=host.querySelector('.color-grid'),svg=host.querySelector('.color-lines'),ns='http://www.w3.org/2000/svg';
  for(let index=0;index<puzzle.size*puzzle.size;index++){
    const cell=document.createElement('button');cell.type='button';cell.className='color-cell';cell.dataset.index=String(index);
    if(blocked.has(index)){cell.classList.add('blocked');cell.disabled=true;cell.setAttribute('aria-label','Blocked cell');}
    else{const colorIndex=endpoint.get(index);if(colorIndex!=null){cell.classList.add('color-endpoint');cell.style.setProperty('--cell-color',puzzle.segments[colorIndex].color);cell.setAttribute('aria-label',`${puzzle.segments[colorIndex].name} endpoint`);}else cell.setAttribute('aria-label','Open color path cell');}
    grid.appendChild(cell);
  }
  function ownerMap(){const owners=new Map();for(const[color,path]of paths)for(const index of path)owners.set(index,color);return owners;}
  function isConnected(segment,color){const path=paths.get(color)||[];return path.length>1&&((path[0]===segment.start&&path.at(-1)===segment.end)||(path[0]===segment.end&&path.at(-1)===segment.start));}
  function connectedColors(){const set=new Set();puzzle.segments.forEach((segment,color)=>{if(isConnected(segment,color))set.add(color);});return set;}
  function connectedCount(){return connectedColors().size;}
  function addLine(path,color,className){if(path.length<2)return;const line=document.createElementNS(ns,'polyline');line.setAttribute('points',polylinePoints(path,puzzle.size));line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('class',className);line.setAttribute('vector-effect','non-scaling-stroke');if(className==='color-solution-line'){line.style.opacity='.20';line.style.strokeWidth='5px';line.style.strokeDasharray='6 8';line.style.filter='none';}svg.appendChild(line);}
  function renderLines(){svg.replaceChildren();if(solutionVisible)puzzle.segments.forEach(segment=>addLine(segment.path,segment.color,'color-solution-line'));for(const[color,path]of paths)addLine(path,puzzle.segments[color].color,'color-player-line');}
  function render(){const owners=ownerMap(),connected=connectedColors();grid.querySelectorAll('.color-cell').forEach(cell=>{const index=Number(cell.dataset.index),color=owners.get(index),endpointColor=endpoint.get(index);cell.classList.toggle('filled',color!=null);cell.classList.toggle('hinted',hintedCells.has(index));cell.classList.toggle('paired',endpointColor!=null&&connected.has(endpointColor));if(color!=null)cell.style.setProperty('--path-color',puzzle.segments[color].color);else cell.style.removeProperty('--path-color');});renderLines();onMetrics({paths:connected.size,redraws});}
  function finish(){complete=true;drag=null;activeColor=null;host.classList.add('game-solved-bloom');render();if(practice){onStatus('');onPracticeComplete('Color Connect practice complete. Reset to trace this board again, or start a New Puzzle.');}else{onStatus('Color Connect complete.');onComplete();}}
  function checkComplete(){if(complete)return true;const allConnected=connectedCount()===puzzle.segments.length,covered=ownerMap().size===puzzle.openCount;if(allConnected&&covered){finish();return true;}onStatus(solutionVisible?'':`${connectedCount()} of ${puzzle.segments.length} color pairs connected.`);return false;}
  function beginPath(color,index,replace=true){if(complete)return;const existing=paths.get(color)||[];if(replace&&existing.length>1)redraws++;paths.set(color,[index]);activeColor=color;render();}
  function addCell(index){
    if(complete||blocked.has(index)||activeColor==null)return false;const path=paths.get(activeColor)||[],last=path.at(-1);if(index===last)return true;if(!areAdjacent(last,index,puzzle.size))return false;
    const ownIndex=path.indexOf(index);if(ownIndex>=0){if(ownIndex===path.length-2){path.pop();render();return true;}return false;}
    const endpointColor=endpoint.get(index);if(endpointColor!=null&&endpointColor!==activeColor)return false;const occupiedBy=ownerMap().get(index);if(occupiedBy!=null&&occupiedBy!==activeColor)return false;
    const completingColor=activeColor;path.push(index);paths.set(activeColor,path);const segment=puzzle.segments[activeColor];if((index===segment.start||index===segment.end)&&path.length>1)activeColor=null;render();grid.querySelector(`[data-index="${index}"]`)?.animate?.([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:130,easing:'ease-out'});
    if(activeColor==null&&isConnected(segment,completingColor))for(const endpointIndex of[segment.start,segment.end])grid.querySelector(`[data-index="${endpointIndex}"]`)?.animate?.([{transform:'scale(.88)',filter:'brightness(1.7)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:360,easing:'ease-out'});
    checkComplete();return true;
  }
  function indexAt(clientX,clientY){const rect=grid.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return-1;const col=Math.min(puzzle.size-1,Math.floor(x/rect.width*puzzle.size)),row=Math.min(puzzle.size-1,Math.floor(y/rect.height*puzzle.size));return row*puzzle.size+col;}
  function colorAtStart(index){const color=endpoint.get(index);if(color!=null)return color;const owners=ownerMap(),owner=owners.get(index);if(owner==null)return null;const path=paths.get(owner)||[];return index===path.at(-1)||index===path[0]?owner:null;}
  function intendedNeighbor(clientX,clientY){if(!drag)return-1;const rect=grid.getBoundingClientRect(),cellW=rect.width/puzzle.size,cellH=rect.height/puzzle.size,current=drag.started?(paths.get(drag.color)||[]).at(-1):drag.start;if(current==null)return-1;const[row,col]=rcOf(current,puzzle.size),cx=rect.left+(col+.5)*cellW,cy=rect.top+(row+.5)*cellH,dx=(clientX-cx)/cellW,dy=(clientY-cy)/cellH,ax=Math.abs(dx),ay=Math.abs(dy),threshold=.38,dominance=1.15;let nr=row,nc=col;if(ax>=threshold&&ax>=ay*dominance)nc+=dx>0?1:-1;else if(ay>=threshold&&ay>=ax*dominance)nr+=dy>0?1:-1;else return-1;if(nr<0||nc<0||nr>=puzzle.size||nc>=puzzle.size)return-1;return nr*puzzle.size+nc;}
  function dragIntent(clientX,clientY){if(!drag||complete)return;for(let guard=0;guard<puzzle.size*2;guard++){const index=intendedNeighbor(clientX,clientY);if(index<0||blocked.has(index))break;if(!drag.started){beginPath(drag.color,drag.start,true);drag.started=true;}const before=(paths.get(drag.color)||[]).at(-1);if(!addCell(index))break;const after=(paths.get(drag.color)||[]).at(-1);if(after===before||activeColor==null)break;}}
  grid.addEventListener('pointerdown',event=>{if(complete)return;const index=indexAt(event.clientX,event.clientY),color=colorAtStart(index);if(index<0||color==null||blocked.has(index))return;drag={start:index,color,started:false};grid.setPointerCapture?.(event.pointerId);event.preventDefault();});
  grid.addEventListener('pointermove',event=>{if(!drag||complete)return;const events=event.getCoalescedEvents?.()||[event];for(const point of events)dragIntent(point.clientX,point.clientY);event.preventDefault();});
  const stop=()=>{if(drag?.started&&!complete)checkComplete();drag=null;activeColor=null;};grid.addEventListener('pointerup',stop);grid.addEventListener('pointercancel',stop);
  onMetrics({paths:0,redraws:0,hints:0});onStatus('');render();
  return{
    supportsUndo:false,
    reset(){host.classList.remove('game-solved-bloom');paths=new Map();activeColor=null;redraws=0;hintedCells=new Set();solutionVisible=false;practice=false;complete=false;drag=null;hintUses=0;render();queueMicrotask(()=>onStatus(''));},
    hint(){if(complete||solutionVisible)return false;hintUses++;const color=puzzle.segments.findIndex((segment,i)=>!isConnected(segment,i));if(color<0)return false;const segment=puzzle.segments[color],current=paths.get(color)||[];let guide=segment.path;if(current[0]===segment.end)guide=[...segment.path].reverse();const prefixOk=current.every((index,i)=>guide[i]===index),reveal=Math.min(3,hintUses);if(!prefixOk&&current.length){hintedCells=new Set([current.at(-1),current.at(-2)].filter(value=>value!=null));onStatus(`Hint ${hintUses}: the ${segment.name} route diverged. Backtrack toward the highlighted cells.`);}else{const startAt=current.length||0;hintedCells=new Set(guide.slice(startAt,startAt+reveal));onStatus(hintUses===1?`Hint 1: focus on the highlighted next cell for the ${segment.name} pair.`:`Hint ${hintUses}: trace the ${segment.name} path through the next ${reveal} highlighted cells.`);}render();setTimeout(()=>{if(!complete){hintedCells=new Set();render();}},4200);return true;},
    solution(){if(complete)return;practice=true;solutionVisible=true;hintedCells=new Set();render();onStatus('');},
    hideSolution(){if(complete)return;solutionVisible=false;hintedCells=new Set();render();queueMicrotask(()=>onStatus(''));},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:redraws*80,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){const routes=[...paths.entries()].map(([color,path])=>({color,path:[...path]}));return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:redraws*80,hintPenalty:hints*190}),metadata:{redraws,paths:connectedCount(),open_cells:puzzle.openCount,blocked_cells:puzzle.blocked.length,size:puzzle.size,routes,complexity:puzzle.quality?.score||0,solver_nodes:puzzle.quality?.solver?.nodes||0,solver_backtracks:puzzle.quality?.solver?.backtracks||0}};},
    destroy(){host.classList.remove('game-solved-bloom');}
  };
}
