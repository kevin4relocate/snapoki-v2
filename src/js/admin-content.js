import {drawGameBoard,clearSocialBoardCache} from './social-game-board.js';
import {getGamePresentation} from './game-presentation.js';

const $=id=>document.getElementById(id);
const state={content:null};
const CONTENT_API='/api/snapdesk-74kq/content';

function notice(message,type=''){
  const el=$('adminNotice');el.textContent=message;el.className=`admin-notice ${type}`.trim();el.hidden=false;
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
function setGeneratorStatus(payload){
  const el=$('generatorStatus'),generator=payload.generator||'template',model=payload.model||'';
  el.className=`generator-status ${generator==='gemini'?'is-gemini':generator==='template-fallback'?'is-fallback':'is-template'}`;
  el.textContent=generator==='gemini'?`Gemini · ${model}`:generator==='template-fallback'?`Template fallback · ${model||'Gemini unavailable'}`:'Template · Gemini key not configured';
  el.title=payload.generationError||'';
}

function background(ctx,w,h){
  const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#0a1020');grad.addColorStop(1,'#131c35');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(124,95,255,.12)';ctx.beginPath();ctx.arc(w*.92,h*.06,190,0,Math.PI*2);ctx.fill();
}
function imageHook(payload){
  const raw=String(payload.headline||'').replace(/\s+/g,' ').trim();
  const first=raw.split(/[.!?]/)[0]?.trim()||'';
  if(first.length>=8&&first.length<=42)return `${first}${raw.includes('?')?'?':''}`;
  const game={key:payload.game?.key||'',slug:payload.game?.slug||'',name:payload.game?.name||'Puzzle',howTo:[]};
  return getGamePresentation(game).socialHook;
}
function drawHook(ctx,text,w){
  let size=48;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f7f9ff';ctx.font=`850 ${size}px system-ui,sans-serif`;
  while(size>34&&ctx.measureText(text).width>w-150){size-=2;ctx.font=`850 ${size}px system-ui,sans-serif`;}
  ctx.fillText(text,w/2,62);
}
function drawWatermark(ctx,w,h){ctx.save();ctx.globalAlpha=.34;ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.fillStyle='#d9e4ff';ctx.font='700 21px system-ui,sans-serif';ctx.fillText('snapoki.com',w-42,h-28);ctx.restore();}
async function drawSquare(canvas,payload){
  canvas.width=1080;canvas.height=1080;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;background(ctx,w,h);drawHook(ctx,imageHook(payload),w);
  const boardSize=900,boardX=(w-boardSize)/2,boardY=105;
  return drawGameBoard(ctx,payload,{x:boardX,y:boardY,size:boardSize}).then(result=>{drawWatermark(ctx,w,h);return result;});
}

async function drawPreview(payload){return drawSquare($('socialCanvas'),payload);}
async function render(content){
  state.content=content;const p=content.payload;
  $('contentDate').textContent=content.date;$('contentGame').textContent=`${p.game.name} · ${p.angle}`;$('angleBadge').textContent=p.angle.toUpperCase().replace('-', ' ');$('headlinePreview').textContent=p.headline;setGeneratorStatus(p);
  $('linkedInText').value=p.linkedIn;$('xText').value=p.x;$('instagramText').value=p.instagram;
  for(const platform of ['linkedIn','x','instagram'])setPosted(platform,Boolean(content.posted?.[platform]));
  updateCounts();await drawPreview(p);$('adminLoading').hidden=true;$('contentPanel').hidden=false;clearNotice();
  if(p.generator==='template-fallback'&&p.generationError)notice(`Gemini fallback: ${p.generationError}`,'error');
}

async function load(){
  try{const data=await request(CONTENT_API);await render(data.content);}catch(error){$('adminLoading').hidden=true;notice(`${error.message} If you are not signed in, sign in on the Snapoki homepage first. If this is the first deploy, configure ADMIN_EMAIL in Cloudflare.`, 'error');}
}
async function save(){
  try{const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'save',headline:$('headlinePreview').textContent,linkedIn:textValue('linkedIn'),x:textValue('x'),instagram:textValue('instagram')})});await render(data.content);notice('Edits saved.');}catch(error){notice(error.message,'error');}
}
async function regenerate(){
  if(!confirm('Generate a different content pack for today? Your current edits will be replaced.'))return;
  try{const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'regenerate'})});clearSocialBoardCache();await render(data.content);notice(data.content.payload.generator==='gemini'?'Generated a new Gemini variation and puzzle image.':'Generated a template fallback and puzzle image.');}catch(error){notice(error.message,'error');}
}
async function togglePosted(platform,button){try{const value=button.dataset.value!=='1';const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'posted',platform,value})});await render(data.content);}catch(error){notice(error.message,'error');}}
async function remove(all=false){
  const label=all?'all stored content':'today’s content';if(!confirm(`Delete ${label}?`))return;
  try{await request(`${CONTENT_API}${all?'?all=1':''}`,{method:'DELETE'});clearSocialBoardCache();state.content=null;$('contentPanel').hidden=true;$('contentDate').textContent='—';$('contentGame').textContent='Deleted';$('generatorStatus').textContent='Generator —';notice(all?'All content deleted. Opening this page again will create a fresh pack for the current day.':'Today’s pack deleted. Opening this page again will generate today again.');}catch(error){notice(error.message,'error');}
}
async function copy(platform){try{await navigator.clipboard.writeText(textValue(platform));notice(`${platform==='linkedIn'?'LinkedIn':platform==='x'?'X':'Instagram'} copied.`);}catch{notice('Could not access the clipboard. Select the text and copy manually.','error');}}
async function downloadCard(){
  if(!state.content?.payload)return;
  try{
    const canvas=$('exportCanvas');await drawSquare(canvas,state.content.payload);const a=document.createElement('a');a.download=`snapoki-${state.content.payload.game?.key||'puzzle'}-${state.content.date}-1080x1080.png`;a.href=canvas.toDataURL('image/png');a.click();
  }catch(error){notice(`Could not render the social card: ${error.message}`,'error');}
}

for(const p of ['linkedIn','x','instagram'])$(`${p}Text`).addEventListener('input',updateCounts);
$('saveAllBtn').addEventListener('click',()=>void save());$('regenerateBtn').addEventListener('click',()=>void regenerate());$('deleteTodayBtn').addEventListener('click',()=>void remove(false));$('deleteAllBtn').addEventListener('click',()=>void remove(true));$('downloadSquareBtn').addEventListener('click',()=>void downloadCard());
document.addEventListener('click',event=>{const copyBtn=event.target.closest('[data-copy]');if(copyBtn)void copy(copyBtn.dataset.copy);const postedBtn=event.target.closest('[data-posted]');if(postedBtn)void togglePosted(postedBtn.dataset.posted,postedBtn);});
void load();
