import {frame,rounded} from './shared.js';

export function drawSocialBoard(ctx,puzzle,box){
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
