import {frame,rounded} from './shared.js';

export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.075,board=size-pad*2,cell=board/n,ox=x+pad,oy=y+pad;frame(ctx,box);ctx.save();
  for(let i=0;i<n*n;i++){
    const r=Math.floor(i/n),c=i%n,cx=ox+c*cell,cy=oy+r*cell,gap=cell*.075,on=Boolean(puzzle.board[i]);rounded(ctx,cx+gap,cy+gap,cell-gap*2,cell-gap*2,cell*.15);ctx.fillStyle=on?'#8edcff':'#111a2d';ctx.fill();ctx.strokeStyle=on?'rgba(176,234,255,.95)':'rgba(87,104,145,.35)';ctx.lineWidth=Math.max(1.5,cell*.025);ctx.stroke();if(on){ctx.save();ctx.globalAlpha=.24;ctx.shadowColor='#62d1ff';ctx.shadowBlur=cell*.38;ctx.fillStyle='#a9e8ff';ctx.fill();ctx.restore();}
  }
  ctx.restore();
}
