import {frame,rounded} from './shared.js';

export function drawSocialBoard(ctx,puzzle,box){
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
