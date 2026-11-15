import {frame,rounded} from './shared.js';

const RIVER=new Set(['3,1','3,2','4,1','4,2','5,1','5,2','3,4','3,5','4,4','4,5','5,4','5,5']);
const DEN=new Set(['0,3','8,3']);
const TRAP=new Set(['0,2','0,4','1,3','8,2','8,4','7,3']);

export function drawSocialBoard(ctx,puzzle,box){
  const{x,y,size}=box,pad=size*.08,left=x+pad,right=x+size-pad,top=y+pad,bottom=y+size*.84;
  frame(ctx,box);ctx.save();rounded(ctx,left,top,right-left,bottom-top,size*.035);ctx.fillStyle='#263427';ctx.fill();
  const cw=(right-left)/7,ch=(bottom-top)/9;
  for(let r=0;r<9;r++)for(let c=0;c<7;c++){
    const px=left+c*cw,py=top+r*ch,k=`${r},${c}`;
    ctx.fillStyle=RIVER.has(k)?'#285f79':DEN.has(k)?'#715c27':TRAP.has(k)?'#5b4328':'#344535';ctx.fillRect(px,py,cw,ch);
    ctx.strokeStyle='rgba(238,242,224,.16)';ctx.lineWidth=Math.max(1,size*.0015);ctx.strokeRect(px,py,cw,ch);
  }
  const pieces=[
    ['🦁',0,0],['🐯',0,6],['🐀',2,0],['🐘',2,6],
    ['🐘',6,0],['🐀',6,6],['🐯',8,0],['🦁',8,6]
  ];
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=String(Math.max(18,size*.052))+'px system-ui,sans-serif';
  for(const[icon,r,c]of pieces)ctx.fillText(icon,left+(c+.5)*cw,top+(r+.5)*ch);
  ctx.fillStyle='#f4f7ff';ctx.font='900 '+String(size*.043)+'px system-ui,sans-serif';ctx.fillText('ANIMAL CHESS · REACH THE DEN',x+size/2,y+size*.93);ctx.restore();
}
