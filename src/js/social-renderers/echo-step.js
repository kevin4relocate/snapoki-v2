import {frame,rounded} from './shared.js';

export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,n=puzzle.size,pad=size*.055,board=size-pad*2,cell=board/n,ox=x+pad,oy=y+pad,blocked=new Set(puzzle.blocked),playerBarriers=new Set(puzzle.playerBarriers||[]),echoBarriers=new Set(puzzle.echoBarriers||[]);
  frame(ctx,box);ctx.save();
  for(let i=0;i<n*n;i++){
    const r=Math.floor(i/n),c=i%n,cx=ox+c*cell,cy=oy+r*cell,gap=Math.max(1.4,cell*.05),shared=blocked.has(i),youWall=playerBarriers.has(i),echoWall=echoBarriers.has(i);
    rounded(ctx,cx+gap,cy+gap,cell-gap*2,cell-gap*2,Math.max(3,cell*.12));
    ctx.fillStyle=shared?'#171d2a':youWall?'rgba(91,72,150,.36)':echoWall?'rgba(28,102,121,.27)':'#0f182b';ctx.fill();
    ctx.strokeStyle=shared?'rgba(115,128,155,.20)':youWall?'rgba(145,127,255,.58)':echoWall?'rgba(93,225,255,.46)':'rgba(75,95,136,.26)';ctx.lineWidth=Math.max(1,cell*.018);ctx.stroke();
    if(shared){ctx.fillStyle='rgba(128,141,170,.28)';rounded(ctx,cx+cell*.31,cy+cell*.31,cell*.38,cell*.38,cell*.08);ctx.fill();}
    if(youWall||echoWall){ctx.fillStyle=youWall?'rgba(190,180,255,.92)':'rgba(177,241,255,.88)';ctx.font=`900 ${Math.max(8,cell*.18)}px system-ui,sans-serif`;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(youWall?'Y':'E',cx+cell*.12,cy+cell*.10);}
  }
  const center=index=>{const r=Math.floor(index/n),c=index%n;return[ox+(c+.5)*cell,oy+(r+.5)*cell];};
  const goal=(index,color)=>{const[cx,cy]=center(index);ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,cell*.055);ctx.setLineDash([Math.max(3,cell*.10),Math.max(3,cell*.08)]);ctx.arc(cx,cy,cell*.30,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);};
  const agent=(index,color,ghost=false,label='')=>{const[cx,cy]=center(index);ctx.save();ctx.globalAlpha=ghost?.78:1;ctx.shadowColor=color;ctx.shadowBlur=cell*.22;ctx.beginPath();ctx.fillStyle=ghost?'rgba(93,225,255,.10)':color;ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,cell*.05);ctx.arc(cx,cy,ghost?cell*.18:cell*.21,0,Math.PI*2);ctx.fill();ctx.stroke();if(label){ctx.fillStyle=ghost?'#a9efff':'#fff';ctx.font=`900 ${Math.max(7,cell*.15)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,cx,cy+cell*.01);}ctx.restore();};
  goal(puzzle.playerGoal,'#917fff');goal(puzzle.echoGoal,'#5de1ff');agent(puzzle.playerStart,'#917fff',false,'YOU');agent(puzzle.echoStart,'#5de1ff',true,'E');
  ctx.restore();
}
