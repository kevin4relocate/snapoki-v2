import {frame,rounded} from './shared.js';
export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,pad=size*.075,left=x+pad,right=x+size-pad,top=y+pad,bottom=y+size-pad;
  frame(ctx,box);ctx.save();rounded(ctx,left,top,right-left,bottom-top,size*.035);ctx.fillStyle='#252c39';ctx.fill();
  const racers=(puzzle.racers||[]).slice(0,8),row=(bottom-top)/Math.max(1,racers.length);ctx.strokeStyle='rgba(220,228,244,.34)';ctx.lineWidth=Math.max(1,size*.002);
  racers.forEach((racer,index)=>{const cy=top+row*(index+.5);if(index<racers.length-1){ctx.beginPath();ctx.moveTo(left,top+row*(index+1));ctx.lineTo(right,top+row*(index+1));ctx.stroke();}ctx.font=String(Math.max(16,size*.042))+'px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(racer.flag,left+size*.02,cy);const progress=.18+((index*37)%62)/100,rx=left+size*.18+(right-left-size*.27)*progress;ctx.font=String(Math.max(18,size*.055))+'px system-ui,sans-serif';ctx.fillText(racer.mascot||'🏎️',rx,cy);});
  ctx.fillStyle='#f4f7ff';ctx.font='900 '+String(size*.047)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('NO FINISH LINE · RUN FOREVER →',x+size/2,y+size*.93);ctx.restore();
}
