import {frame} from './shared.js';

export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.045,board=size-pad*2,cell=board/n,ox=x+pad,oy=y+pad;
  frame(ctx,box);ctx.save();ctx.strokeStyle='#71809f';ctx.lineWidth=Math.max(1.2,size*.0024);ctx.lineCap='square';ctx.beginPath();
  const N=1,E=2,S=4,W=8;
  puzzle.walls.forEach((mask,index)=>{const r=Math.floor(index/n),c=index%n,cx=ox+c*cell,cy=oy+r*cell;if(mask&N){ctx.moveTo(cx,cy);ctx.lineTo(cx+cell,cy);}if(mask&W){ctx.moveTo(cx,cy);ctx.lineTo(cx,cy+cell);}if(r===n-1&&mask&S){ctx.moveTo(cx,cy+cell);ctx.lineTo(cx+cell,cy+cell);}if(c===n-1&&mask&E){ctx.moveTo(cx+cell,cy);ctx.lineTo(cx+cell,cy+cell);}});ctx.stroke();
  const dot=(index,color)=>{const r=Math.floor(index/n),c=index%n;ctx.beginPath();ctx.fillStyle=color;ctx.arc(ox+(c+.5)*cell,oy+(r+.5)*cell,Math.max(4,cell*.31),0,Math.PI*2);ctx.fill();};
  dot(puzzle.start,'#765cff');dot(puzzle.end,'#37d99a');ctx.restore();
}
