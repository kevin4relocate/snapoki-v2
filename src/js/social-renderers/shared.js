export function rounded(ctx,x,y,w,h,r){
  const radius=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.arcTo(x+w,y,x+w,y+h,radius);
  ctx.arcTo(x+w,y+h,x,y+h,radius);
  ctx.arcTo(x,y+h,x,y,radius);
  ctx.arcTo(x,y,x+w,y,radius);
  ctx.closePath();
}

export function frame(ctx,{x,y,size}){
  ctx.save();
  rounded(ctx,x,y,size,size,Math.max(18,size*.035));
  ctx.fillStyle='#090f1d';ctx.fill();
  ctx.strokeStyle='rgba(127,145,202,.30)';ctx.lineWidth=Math.max(2,size*.004);ctx.stroke();
  ctx.restore();
}

export function drawFallback(ctx,payload,{x,y,size}){
  frame(ctx,{x,y,size});
  ctx.save();
  ctx.fillStyle='#121a2e';
  rounded(ctx,x+size*.09,y+size*.09,size*.82,size*.82,size*.05);ctx.fill();
  ctx.fillStyle='#8fa4ff';ctx.font=`900 ${size*.13}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText((payload.game?.name||'Snapoki').slice(0,2).toUpperCase(),x+size/2,y+size/2);
  ctx.restore();
}
