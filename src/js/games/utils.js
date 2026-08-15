export function hashString(input = '') {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rngFromSeed(seed = '') { let a = hashString(seed) || 0x6d2b79f5; return () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export function shuffle(items,rng=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value)); export const indexOf=(row,col,cols)=>row*cols+col; export const rcOf=(index,cols)=>[Math.floor(index/cols),index%cols];
export function orthogonalNeighbors(index,rows,cols){const [row,col]=rcOf(index,cols),out=[];if(row>0)out.push(indexOf(row-1,col,cols));if(col<cols-1)out.push(indexOf(row,col+1,cols));if(row<rows-1)out.push(indexOf(row+1,col,cols));if(col>0)out.push(indexOf(row,col-1,cols));return out;}
export function areAdjacent(a,b,cols){const [ar,ac]=rcOf(a,cols),[br,bc]=rcOf(b,cols);return Math.abs(ar-br)+Math.abs(ac-bc)===1;}
function transformCoord(row,col,size,variant){let r=row,c=col;if(variant&1)c=size-1-c;if(variant&2)r=size-1-r;if(variant&4)[r,c]=[c,r];return[r,c];}
export function deterministicHamiltonianPath(size,seed=''){const base=[];for(let row=0;row<size;row++){if(row%2===0){for(let col=0;col<size;col++)base.push([row,col]);}else{for(let col=size-1;col>=0;col--)base.push([row,col]);}}const variant=hashString(seed)%8;let path=base.map(([r,c])=>transformCoord(r,c,size,variant));if(hashString(`${seed}:reverse`)%2)path=path.reverse();return path.map(([r,c])=>indexOf(r,c,size));}
export function randomizedOpenPath(size,targetCount,seed=''){const total=size*size,target=clamp(Math.round(targetCount),2,total),rng=rngFromSeed(`${seed}:open-path`),starts=shuffle(Array.from({length:total},(_,i)=>i),rng),maxNodes=180000;let visitedNodes=0;for(const start of starts.slice(0,Math.min(total,14))){const path=[start],used=new Set(path);function dfs(current){if(path.length===target)return true;if(++visitedNodes>maxNodes)return false;let candidates=orthogonalNeighbors(current,size,size).filter(next=>!used.has(next));candidates=candidates.map(next=>({next,onward:orthogonalNeighbors(next,size,size).filter(n=>!used.has(n)).length,jitter:rng()})).sort((a,b)=>a.onward-b.onward||a.jitter-b.jitter);for(const {next} of candidates){used.add(next);path.push(next);if(dfs(next))return true;path.pop();used.delete(next);}return false;}if(dfs(start))return path;if(visitedNodes>maxNodes)break;}return deterministicHamiltonianPath(size,seed).slice(0,target);}

export function blockedLayoutStats(blocked,size){
  const set=new Set(blocked),seen=new Set();let adjacentPairs=0,isolated=0,largestCluster=0;const quadrants=new Set(),rows=new Set(),cols=new Set();
  for(const index of set){const[r,c]=rcOf(index,size),neighbors=orthogonalNeighbors(index,size,size).filter(next=>set.has(next));adjacentPairs+=neighbors.filter(next=>next>index).length;if(!neighbors.length)isolated++;quadrants.add(`${r<size/2?0:1}:${c<size/2?0:1}`);rows.add(r);cols.add(c);if(seen.has(index))continue;let cluster=0,queue=[index];seen.add(index);while(queue.length){const current=queue.shift();cluster++;for(const next of orthogonalNeighbors(current,size,size))if(set.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}}largestCluster=Math.max(largestCluster,cluster);}
  return{adjacentPairs,isolated,largestCluster,quadrants:quadrants.size,rowSpread:rows.size,colSpread:cols.size};
}
function pathTurns(path,size){let turns=0,last='';for(let i=1;i<path.length;i++){const[aR,aC]=rcOf(path[i-1],size),[bR,bC]=rcOf(path[i],size),dir=bR<aR?'u':bR>aR?'d':bC<aC?'l':'r';if(last&&dir!==last)turns++;last=dir;}return turns;}
function blockedCandidateQuality(candidate,size,blockedCount){
  const {stats,path}=candidate,maxCluster=Math.max(2,Math.ceil(blockedCount*.60));
  const gatePenalty=(stats.largestCluster>maxCluster?1600+(stats.largestCluster-maxCluster)*500:0)+(stats.quadrants<Math.min(3,blockedCount)?600:0)+(stats.rowSpread<Math.min(3,blockedCount)?300:0)+(stats.colSpread<Math.min(3,blockedCount)?300:0);
  return -gatePenalty-stats.largestCluster*180-stats.adjacentPairs*70+stats.isolated*54+stats.quadrants*70+(stats.rowSpread+stats.colSpread)*18+pathTurns(path,size)*.45;
}
export function selectScatteredOpenPath(size,targetCount,seed='',maxCandidates=28){
  const total=size*size,target=clamp(Math.round(targetCount),2,total);if(target===total)return randomizedOpenPath(size,target,seed);
  const blockedCount=total-target,maxCluster=Math.max(2,Math.ceil(blockedCount*.60));let best=null;
  for(let i=0;i<maxCandidates;i++){
    const path=randomizedOpenPath(size,target,`${seed}:layout:${i}`),open=new Set(path),blocked=[];for(let index=0;index<total;index++)if(!open.has(index))blocked.push(index);
    const stats=blockedLayoutStats(blocked,size),candidate={path,blocked,stats},score=blockedCandidateQuality(candidate,size,blockedCount);candidate.score=score;
    if(!best||score>best.score)best=candidate;
    const spreadEnough=stats.quadrants>=Math.min(3,blockedCount)&&stats.rowSpread>=Math.min(3,blockedCount)&&stats.colSpread>=Math.min(3,blockedCount);
    if(spreadEnough&&stats.largestCluster<=maxCluster&&stats.adjacentPairs<=Math.max(1,Math.floor(blockedCount*.35)))break;
  }
  return best?.path||randomizedOpenPath(size,target,seed);
}

export function directionLabel(from,to,cols){const [fr,fc]=rcOf(from,cols),[tr,tc]=rcOf(to,cols);if(tr<fr)return'up';if(tr>fr)return'down';if(tc<fc)return'left';if(tc>fc)return'right';return'forward';}
export function dailySeed(game,difficulty,date=new Date()){return `${game}:${date.toISOString().slice(0,10)}:${difficulty}`;}
export function randomSeed(game,difficulty){const values=crypto.getRandomValues(new Uint32Array(3));return `${game}:${difficulty}:${Date.now().toString(36)}:${Array.from(values).join('-')}`;}
export function formatTime(ms){const seconds=Math.max(0,Math.floor(ms/1000)),minutes=Math.floor(seconds/60);return `${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
const SCORE_TIME_DIVISORS={maze:{easy:45,medium:80,hard:120},'number-path':{easy:50,medium:90,hard:140},'color-connect':{easy:55,medium:95,hard:150},'lights-out':{easy:50,medium:85,hard:125},'loop-puzzle':{easy:65,medium:110,hard:170}};
export function scoreTimeDivisor(game,difficulty){return SCORE_TIME_DIVISORS[game]?.[difficulty]||40;}
export function scoreFromPerformance({timeMs=0,timeDivisor=40,actionPenalty=0,mistakePenalty=0,hintPenalty=0}){return clamp(Math.round(5000-timeMs/timeDivisor-actionPenalty-mistakePenalty-hintPenalty),250,5000);}
