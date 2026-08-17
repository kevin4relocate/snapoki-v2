import {frame} from './shared.js';

export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.09,board=size-pad*2,step=board/n,ox=x+pad,oy=y+pad;frame(ctx,box);ctx.save();ctx.strokeStyle='rgba(104,124,166,.32)';ctx.lineWidth=Math.max(1.2,size*.0025);ctx.beginPath();
  for(let r=0;r<=n;r++){ctx.moveTo(ox,oy+r*step);ctx.lineTo(ox+board,oy+r*step);}for(let c=0;c<=n;c++){ctx.moveTo(ox+c*step,oy);ctx.lineTo(ox+c*step,oy+board);}ctx.stroke();
  ctx.fillStyle='#7887a8';for(let r=0;r<=n;r++)for(let c=0;c<=n;c++){ctx.beginPath();ctx.arc(ox+c*step,oy+r*step,Math.max(1.8,step*.045),0,Math.PI*2);ctx.fill();}
  for(const clue of puzzle.clues){const cx=ox+(clue.c+.5)*step,cy=oy+(clue.r+.5)*step;ctx.fillStyle=clue.value===3?'#e9f2ff':clue.value===0?'#73809e':'#b8c8e6';ctx.font=`800 ${Math.max(13,step*.35)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(clue.value),cx,cy);}
  ctx.restore();
}
