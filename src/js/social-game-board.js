import {generateMaze} from './games/maze.js';
import {generateNumberPath} from './games/number-path.js';
import {generateColorConnect} from './games/color-connect.js';
import {generateLightsOut} from './games/lights-out.js';
import {generateLoopPuzzle} from './games/loop-puzzle.js';

const cache=new Map();

function rounded(ctx,x,y,w,h,r){
  const radius=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.arcTo(x+w,y,x+w,y+h,radius);
  ctx.arcTo(x+w,y+h,x,y+h,radius);
  ctx.arcTo(x,y+h,x,y,radius);
  ctx.arcTo(x,y,x+w,y,radius);
  ctx.closePath();
}

function puzzleSeed(payload){return `social:${payload.date||'today'}:${payload.variant||0}:${payload.game?.key||'game'}`;}

function generatePuzzle(payload){
  const key=payload.game?.key||'',seed=puzzleSeed(payload),cacheKey=`${key}:${seed}`;
  if(cache.has(cacheKey))return cache.get(cacheKey);
  const generators={
    maze:generateMaze,
    'number-path':generateNumberPath,
    'color-connect':generateColorConnect,
    'lights-out':generateLightsOut,
    'loop-puzzle':generateLoopPuzzle
  };
  const generator=generators[key];
  if(!generator){cache.set(cacheKey,null);return null;}
  let puzzle=null;
  for(let attempt=0;attempt<3&&!puzzle;attempt++){
    try{puzzle=generator('hard',`${seed}:attempt:${attempt}`);}catch(error){console.warn(`Social preview ${key} attempt ${attempt+1} failed.`,error);}
  }
  cache.set(cacheKey,puzzle);return puzzle;
}

function frame(ctx,{x,y,size}){
  ctx.save();
  rounded(ctx,x,y,size,size,Math.max(18,size*.035));
  ctx.fillStyle='#090f1d';ctx.fill();
  ctx.strokeStyle='rgba(127,145,202,.30)';ctx.lineWidth=Math.max(2,size*.004);ctx.stroke();
  ctx.restore();
}

function drawMaze(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.045,board=size-pad*2,cell=board/n,ox=x+pad,oy=y+pad;
  frame(ctx,box);ctx.save();ctx.strokeStyle='#71809f';ctx.lineWidth=Math.max(1.2,size*.0024);ctx.lineCap='square';ctx.beginPath();
  const N=1,E=2,S=4,W=8;
  puzzle.walls.forEach((mask,index)=>{const r=Math.floor(index/n),c=index%n,cx=ox+c*cell,cy=oy+r*cell;if(mask&N){ctx.moveTo(cx,cy);ctx.lineTo(cx+cell,cy);}if(mask&W){ctx.moveTo(cx,cy);ctx.lineTo(cx,cy+cell);}if(r===n-1&&mask&S){ctx.moveTo(cx,cy+cell);ctx.lineTo(cx+cell,cy+cell);}if(c===n-1&&mask&E){ctx.moveTo(cx+cell,cy);ctx.lineTo(cx+cell,cy+cell);}});ctx.stroke();
  const dot=(index,color)=>{const r=Math.floor(index/n),c=index%n;ctx.beginPath();ctx.fillStyle=color;ctx.arc(ox+(c+.5)*cell,oy+(r+.5)*cell,Math.max(4,cell*.31),0,Math.PI*2);ctx.fill();};
  dot(puzzle.start,'#765cff');dot(puzzle.end,'#37d99a');ctx.restore();
}

function drawNumberPath(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.055,board=size-pad*2,cell=board/n,ox=x+pad,oy=y+pad,blocked=new Set(puzzle.blocked),clues=new Map(puzzle.clues.map(clue=>[clue.index,clue.label]));
  frame(ctx,box);ctx.save();
  for(let i=0;i<n*n;i++){
    const r=Math.floor(i/n),c=i%n,cx=ox+c*cell,cy=oy+r*cell,gap=Math.max(1.5,cell*.055);
    rounded(ctx,cx+gap,cy+gap,cell-gap*2,cell-gap*2,Math.max(4,cell*.13));
    ctx.fillStyle=blocked.has(i)?'#171d2a':'#0f1a2d';ctx.fill();ctx.strokeStyle=blocked.has(i)?'rgba(111,123,150,.18)':'rgba(76,103,151,.28)';ctx.lineWidth=1;ctx.stroke();
    if(blocked.has(i)){ctx.strokeStyle='rgba(123,135,164,.30)';ctx.lineWidth=Math.max(1.5,cell*.045);ctx.beginPath();ctx.moveTo(cx+cell*.34,cy+cell*.34);ctx.lineTo(cx+cell*.66,cy+cell*.66);ctx.moveTo(cx+cell*.66,cy+cell*.34);ctx.lineTo(cx+cell*.34,cy+cell*.66);ctx.stroke();}
    if(clues.has(i)){
      ctx.beginPath();ctx.fillStyle='#e8fbff';ctx.arc(cx+cell/2,cy+cell/2,cell*.29,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#28c9f5';ctx.lineWidth=Math.max(2,cell*.055);ctx.stroke();ctx.fillStyle='#0b1626';ctx.font=`800 ${Math.max(11,cell*.29)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(clues.get(i)),cx+cell/2,cy+cell/2+cell*.01);
    }
  }
  ctx.restore();
}

function drawColorConnect(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.055,board=size-pad*2,cell=board/n,ox=x+pad,oy=y+pad,blocked=new Set(puzzle.blocked),endpoints=new Map();
  puzzle.segments.forEach(segment=>{endpoints.set(segment.start,segment.color);endpoints.set(segment.end,segment.color);});frame(ctx,box);ctx.save();
  for(let i=0;i<n*n;i++){
    const r=Math.floor(i/n),c=i%n,cx=ox+c*cell,cy=oy+r*cell,gap=Math.max(1.4,cell*.045);
    rounded(ctx,cx+gap,cy+gap,cell-gap*2,cell-gap*2,Math.max(3,cell*.11));ctx.fillStyle=blocked.has(i)?'#1a2130':'#0d1728';ctx.fill();ctx.strokeStyle=blocked.has(i)?'rgba(122,134,160,.24)':'rgba(72,92,131,.22)';ctx.lineWidth=1;ctx.stroke();
    if(blocked.has(i)){ctx.fillStyle='rgba(128,141,170,.32)';rounded(ctx,cx+cell*.30,cy+cell*.30,cell*.40,cell*.40,cell*.08);ctx.fill();}
    const color=endpoints.get(i);if(color){ctx.beginPath();ctx.fillStyle=color;ctx.arc(cx+cell/2,cy+cell/2,cell*.28,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.28;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,cell*.08);ctx.arc(cx+cell/2,cy+cell/2,cell*.38,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  }
  ctx.restore();
}

function drawLightsOut(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.075,board=size-pad*2,cell=board/n,ox=x+pad,oy=y+pad;frame(ctx,box);ctx.save();
  for(let i=0;i<n*n;i++){
    const r=Math.floor(i/n),c=i%n,cx=ox+c*cell,cy=oy+r*cell,gap=cell*.075,on=Boolean(puzzle.board[i]);rounded(ctx,cx+gap,cy+gap,cell-gap*2,cell-gap*2,cell*.15);ctx.fillStyle=on?'#8edcff':'#111a2d';ctx.fill();ctx.strokeStyle=on?'rgba(176,234,255,.95)':'rgba(87,104,145,.35)';ctx.lineWidth=Math.max(1.5,cell*.025);ctx.stroke();if(on){ctx.save();ctx.globalAlpha=.24;ctx.shadowColor='#62d1ff';ctx.shadowBlur=cell*.38;ctx.fillStyle='#a9e8ff';ctx.fill();ctx.restore();}
  }
  ctx.restore();
}

function drawLoop(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.09,board=size-pad*2,step=board/n,ox=x+pad,oy=y+pad;frame(ctx,box);ctx.save();ctx.strokeStyle='rgba(104,124,166,.32)';ctx.lineWidth=Math.max(1.2,size*.0025);ctx.beginPath();
  for(let r=0;r<=n;r++){ctx.moveTo(ox,oy+r*step);ctx.lineTo(ox+board,oy+r*step);}for(let c=0;c<=n;c++){ctx.moveTo(ox+c*step,oy);ctx.lineTo(ox+c*step,oy+board);}ctx.stroke();
  ctx.fillStyle='#7887a8';for(let r=0;r<=n;r++)for(let c=0;c<=n;c++){ctx.beginPath();ctx.arc(ox+c*step,oy+r*step,Math.max(1.8,step*.045),0,Math.PI*2);ctx.fill();}
  for(const clue of puzzle.clues){const cx=ox+(clue.c+.5)*step,cy=oy+(clue.r+.5)*step;ctx.fillStyle=clue.value===3?'#e9f2ff':clue.value===0?'#73809e':'#b8c8e6';ctx.font=`800 ${Math.max(13,step*.35)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(clue.value),cx,cy);}
  ctx.restore();
}

function drawFallback(ctx,payload,box){
  frame(ctx,box);const{x,y,size}=box;ctx.save();ctx.fillStyle='#121a2e';rounded(ctx,x+size*.09,y+size*.09,size*.82,size*.82,size*.05);ctx.fill();ctx.fillStyle='#8fa4ff';ctx.font=`900 ${size*.13}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText((payload.game?.name||'Snapoki').slice(0,2).toUpperCase(),x+size/2,y+size/2);ctx.restore();
}

export function drawGameBoard(ctx,payload,box){
  const puzzle=generatePuzzle(payload),key=payload.game?.key;
  if(!puzzle){drawFallback(ctx,payload,box);return{generated:false,difficulty:'hard'};}
  if(key==='maze')drawMaze(ctx,puzzle,box);
  else if(key==='number-path')drawNumberPath(ctx,puzzle,box);
  else if(key==='color-connect')drawColorConnect(ctx,puzzle,box);
  else if(key==='lights-out')drawLightsOut(ctx,puzzle,box);
  else if(key==='loop-puzzle')drawLoop(ctx,puzzle,box);
  else drawFallback(ctx,payload,box);
  return{generated:true,difficulty:puzzle.difficulty||'hard',size:puzzle.size};
}

export function clearSocialBoardCache(){cache.clear();}
