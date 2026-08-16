import {drawGameBoard,clearSocialBoardCache} from './social-game-board.js';

const $ = id => document.getElementById(id);
const state = {content:null};
const CONTENT_API='/api/snapdesk-74kq/content';

function notice(message,type=''){
  const el=$('adminNotice');
  el.textContent=message;el.className=`admin-notice ${type}`.trim();el.hidden=false;
}
function clearNotice(){$('adminNotice').hidden=true;}

async function request(url,options={}){
  const response=await fetch(url,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
  return data;
}

function textValue(platform){return $(`${platform}Text`).value;}
function updateCounts(){for(const p of ['linkedIn','x','instagram'])$(`${p}Count`).textContent=String(textValue(p).length);}
function setPosted(platform,value){const status=$(`${platform}Status`),button=document.querySelector(`[data-posted="${platform}"]`);status.textContent=value?'Posted':'Not posted';status.style.color=value?'#69e8a8':'';button.textContent=value?'Unmark':'Mark posted';button.dataset.value=value?'1':'0';}

function wrapText(ctx,text,maxWidth){
  const words=String(text||'').split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
  if(line)lines.push(line);return lines;
}
function rounded(ctx,x,y,w,h,r){const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();}
function background(ctx,w,h){
  const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#0b1120');grad.addColorStop(.58,'#10172b');grad.addColorStop(1,'#182344');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(124,95,255,.18)';ctx.beginPath();ctx.arc(w*.91,h*.06,Math.min(w,h)*.20,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(49,204,255,.08)';ctx.beginPath();ctx.arc(w*.05,h*.90,Math.min(w,h)*.24,0,Math.PI*2);ctx.fill();
}
function smallCaps(ctx,text,x,y,size=21){ctx.fillStyle='#aab7ff';ctx.font=`850 ${size}px system-ui,sans-serif`;ctx.fillText(text,x,y);}
function hook(ctx,text,x,y,maxWidth,fontSize,maxLines=2,lineHeight=1.08){
  ctx.fillStyle='#fff';ctx.font=`850 ${fontSize}px system-ui,sans-serif`;const lines=wrapText(ctx,text,maxWidth).slice(0,maxLines);lines.forEach((line,i)=>ctx.fillText(line,x,y+i*fontSize*lineHeight));return lines.length;
}
function brand(ctx,w,h,x=56){ctx.fillStyle='#fff';ctx.font='850 27px system-ui,sans-serif';ctx.fillText('Snapoki',x,h-48);ctx.fillStyle='#55d4ff';ctx.font='750 21px system-ui,sans-serif';ctx.fillText('snapoki.com',x+112,h-48);}
function difficultyPill(ctx,x,y,label='HARD • PLAY IT YOURSELF'){
  ctx.font='850 17px system-ui,sans-serif';const width=ctx.measureText(label).width+30;rounded(ctx,x,y-27,width,38,19);ctx.fillStyle='rgba(5,10,20,.88)';ctx.fill();ctx.strokeStyle='rgba(121,142,200,.38)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#d8e3ff';ctx.fillText(label,x+15,y-2);
}

function drawPortrait(canvas,payload){
  canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;background(ctx,w,h);
  smallCaps(ctx,`${String(payload.game?.name||'SNAPOKI').toUpperCase()} • DAILY CHALLENGE`,58,67,20);
  hook(ctx,payload.headline||`Can you solve this ${payload.game?.name||'puzzle'}?`,58,126,964,45,2,1.05);
  const boardSize=930,boardX=(w-boardSize)/2,boardY=205,meta=drawGameBoard(ctx,payload,{x:boardX,y:boardY,size:boardSize});
  difficultyPill(ctx,boardX+24,boardY+boardSize-18,`${String(meta.difficulty||'hard').toUpperCase()} • NO SOLUTION SHOWN`);
  brand(ctx,w,h,58);
}

function drawLandscape(canvas,payload){
  canvas.width=1200;canvas.height=675;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;background(ctx,w,h);
  const boardSize=605,boardX=w-boardSize-35,boardY=35,meta=drawGameBoard(ctx,payload,{x:boardX,y:boardY,size:boardSize});
  const left=48,leftWidth=470;smallCaps(ctx,String(payload.game?.name||'SNAPOKI').toUpperCase(),left,72,20);
  hook(ctx,payload.headline||`Can you solve this ${payload.game?.name||'puzzle'}?`,left,143,leftWidth,47,3,1.06);
  difficultyPill(ctx,left,390,`${String(meta.difficulty||'hard').toUpperCase()} • NO HINTS`);
  ctx.fillStyle='#95a3c4';ctx.font='650 21px system-ui,sans-serif';ctx.fillText('Try the board before checking the answer.',left,448);
  ctx.fillStyle='#fff';ctx.font='850 27px system-ui,sans-serif';ctx.fillText('Snapoki',left,h-58);ctx.fillStyle='#55d4ff';ctx.font='750 21px system-ui,sans-serif';ctx.fillText('snapoki.com',left+112,h-58);
}

function drawPreview(payload){drawPortrait($('socialCanvas'),payload);}
function render(content){
  state.content=content;const p=content.payload;
  $('contentDate').textContent=content.date;$('contentGame').textContent=`${p.game.name} · ${p.angle}`;$('angleBadge').textContent=p.angle.toUpperCase().replace('-', ' ');$('headlinePreview').textContent=p.headline;
  $('linkedInText').value=p.linkedIn;$('xText').value=p.x;$('instagramText').value=p.instagram;
  for(const platform of ['linkedIn','x','instagram'])setPosted(platform,Boolean(content.posted?.[platform]));
  updateCounts();drawPreview(p);$('adminLoading').hidden=true;$('contentPanel').hidden=false;clearNotice();
}

async function load(){
  try{const data=await request(CONTENT_API);render(data.content);}catch(error){$('adminLoading').hidden=true;notice(`${error.message} If you are not signed in, sign in on the Snapoki homepage first. If this is the first deploy, configure ADMIN_EMAIL in Cloudflare.`, 'error');}
}
async function save(){
  try{const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'save',headline:$('headlinePreview').textContent,linkedIn:textValue('linkedIn'),x:textValue('x'),instagram:textValue('instagram')})});render(data.content);notice('Edits saved.');}catch(error){notice(error.message,'error');}
}
async function regenerate(){
  if(!confirm('Generate a different content pack for today? Your current edits will be replaced.'))return;
  try{const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'regenerate'})});clearSocialBoardCache();render(data.content);notice('Generated a new variation and a new puzzle image for today.');}catch(error){notice(error.message,'error');}
}
async function togglePosted(platform,button){
  try{const value=button.dataset.value!=='1';const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'posted',platform,value})});render(data.content);}catch(error){notice(error.message,'error');}
}
async function remove(all=false){
  const label=all?'all stored content':'today’s content';if(!confirm(`Delete ${label}?`))return;
  try{await request(`${CONTENT_API}${all?'?all=1':''}`,{method:'DELETE'});clearSocialBoardCache();state.content=null;$('contentPanel').hidden=true;$('contentDate').textContent='—';$('contentGame').textContent='Deleted';notice(all?'All content deleted. Opening this page again will create a fresh pack for the current day.':'Today’s pack deleted. Opening this page again will generate today again.');}catch(error){notice(error.message,'error');}
}
async function copy(platform){
  try{await navigator.clipboard.writeText(textValue(platform));notice(`${platform==='linkedIn'?'LinkedIn':platform==='x'?'X':'Instagram'} copied.`);}catch{notice('Could not access the clipboard. Select the text and copy manually.','error');}
}
function downloadCard(format){
  if(!state.content?.payload)return;const canvas=$('exportCanvas');
  if(format==='landscape')drawLandscape(canvas,state.content.payload);else drawPortrait(canvas,state.content.payload);
  const dims=format==='landscape'?'1200x675':'1080x1350',a=document.createElement('a');a.download=`snapoki-${state.content.payload.game?.key||'puzzle'}-${state.content.date}-${dims}.png`;a.href=canvas.toDataURL('image/png');a.click();
}

for(const p of ['linkedIn','x','instagram'])$(`${p}Text`).addEventListener('input',updateCounts);
$('saveAllBtn').addEventListener('click',save);$('regenerateBtn').addEventListener('click',regenerate);$('deleteTodayBtn').addEventListener('click',()=>remove(false));$('deleteAllBtn').addEventListener('click',()=>remove(true));
$('downloadPortraitBtn').addEventListener('click',()=>downloadCard('portrait'));$('downloadLandscapeBtn').addEventListener('click',()=>downloadCard('landscape'));
document.addEventListener('click',event=>{const copyBtn=event.target.closest('[data-copy]');if(copyBtn)copy(copyBtn.dataset.copy);const postedBtn=event.target.closest('[data-posted]');if(postedBtn)togglePosted(postedBtn.dataset.posted,postedBtn);});
load();
