import {frame,rounded} from './shared.js';
export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,pad=size*.07,left=x+pad,top=y+pad,w=size-2*pad,h=size-2*pad;
  frame(ctx,box);ctx.save();rounded(ctx,left,top,w,h,size*.04);ctx.clip();
  const sea=ctx.createLinearGradient(left,top,left,top+h);
  sea.addColorStop(0,'#165e73');sea.addColorStop(.7,'#0c3a52');sea.addColorStop(1,'#08252f');
  ctx.fillStyle=sea;ctx.fillRect(left,top,w,h);
  ctx.fillStyle='rgba(130,246,238,.06)';
  for(let i=0;i<12;i++){const bx=left+w*((i*37%91)/100+.04),by=top+h*((i*23%77)/100+.08);ctx.beginPath();ctx.arc(bx,by,size*(.006+i%4*.002),0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#1e5752';ctx.fillRect(left,top+h*.91,w,h*.09);
  const plants=[.045,.1,.17,.8,.86,.94];
  for(let i=0;i<plants.length;i++){const px=left+w*plants[i];ctx.strokeStyle=i%2?'#2a9b83':'#218579';ctx.lineWidth=size*.009;ctx.beginPath();ctx.moveTo(px,top+h*.94);ctx.quadraticCurveTo(px+size*.035*(i%2?1:-1),top+h*.74,px+size*.012,top+h*(.71+i%3*.045));ctx.stroke();}
  const creatures=(puzzle.swimmers||[]).slice(0,12);
  ctx.textAlign='center';ctx.textBaseline='middle';
  creatures.forEach((swimmer,i)=>{
    const px=left+w*swimmer.x,py=top+h*swimmer.y;
    ctx.font=String(Math.max(22,Math.round(size*(.06+(i%3)*.006))))+'px system-ui, sans-serif';
    ctx.fillText(swimmer.emoji,px,py);
  });
  ctx.fillStyle='#dbfffa';ctx.font='900 '+String(size*.055)+'px system-ui,sans-serif';
  ctx.fillText('AQUARIUM LOOP',x+size/2,y+size*.923);
  ctx.fillStyle='#b2ded9';ctx.font='700 '+String(size*.023)+'px system-ui,sans-serif';
  ctx.fillText('WATCH THE OCEAN DRIFT',x+size/2,y+size*.964);
  ctx.restore();
}
