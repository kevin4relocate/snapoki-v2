import {frame} from './shared.js';
export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,pad=size*.11,board=size-pad*2,step=board/(puzzle.size-1),px=island=>x+pad+island.col*step,py=island=>y+pad+island.row*step;frame(ctx,box);ctx.save();ctx.lineCap='round';
  ctx.setLineDash([Math.max(5,size*.012),Math.max(7,size*.018)]);ctx.strokeStyle='rgba(117,139,192,.16)';ctx.lineWidth=Math.max(2,size*.004);
  for(const edge of puzzle.edges){const a=puzzle.islands[edge.a],b=puzzle.islands[edge.b];ctx.beginPath();ctx.moveTo(px(a),py(a));ctx.lineTo(px(b),py(b));ctx.stroke();}
  ctx.setLineDash([]);
  for(const island of puzzle.islands){const cx=px(island),cy=py(island),r=Math.max(11,size*.032);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#151d31';ctx.fill();ctx.strokeStyle='#8fa5ff';ctx.lineWidth=Math.max(2,size*.004);ctx.stroke();ctx.fillStyle='#f6f8ff';ctx.font=`900 ${Math.max(12,size*.025)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(island.clue),cx,cy+1);}ctx.restore();
}
