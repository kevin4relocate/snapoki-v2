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
  const words=String(text).split(/\s+/),lines=[];let line='';
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
  if(line)lines.push(line);return lines;
}
function drawCard(payload){
  const canvas=$('socialCanvas'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#11182b');grad.addColorStop(.55,'#10152b');grad.addColorStop(1,'#18204a');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(124,95,255,.20)';ctx.beginPath();ctx.arc(890,170,280,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(49,204,255,.13)';ctx.beginPath();ctx.arc(170,1170,310,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#aab7ff';ctx.font='800 28px system-ui, sans-serif';ctx.letterSpacing='4px';ctx.fillText(payload.image?.eyebrow||'SNAPOKI',74,110);
  ctx.fillStyle='#fff';ctx.font='800 72px system-ui, sans-serif';const lines=wrapText(ctx,payload.headline,900).slice(0,4);lines.forEach((line,i)=>ctx.fillText(line,74,260+i*88));
  ctx.fillStyle='#aab3cf';ctx.font='600 34px system-ui, sans-serif';ctx.fillText(payload.image?.subtitle||payload.game.name,74,660);
  ctx.strokeStyle='rgba(148,162,209,.32)';ctx.lineWidth=2;ctx.strokeRect(74,730,932,350);
  ctx.fillStyle='#8d9bc3';ctx.font='700 23px system-ui, sans-serif';ctx.fillText('WHY IT IS INTERESTING',112,790);
  ctx.fillStyle='#edf1ff';ctx.font='500 34px system-ui, sans-serif';const insight=wrapText(ctx,payload.insight,820).slice(0,6);insight.forEach((line,i)=>ctx.fillText(line,112,855+i*48));
  ctx.fillStyle='#fff';ctx.font='800 34px system-ui, sans-serif';ctx.fillText('Snapoki',74,1240);ctx.fillStyle='#55d4ff';ctx.font='750 28px system-ui, sans-serif';ctx.fillText('Play free at snapoki.com',74,1290);
}

function render(content){
  state.content=content;const p=content.payload;
  $('contentDate').textContent=content.date;$('contentGame').textContent=`${p.game.name} · ${p.angle}`;$('angleBadge').textContent=p.angle.toUpperCase().replace('-', ' ');$('headlinePreview').textContent=p.headline;
  $('linkedInText').value=p.linkedIn;$('xText').value=p.x;$('instagramText').value=p.instagram;
  for(const platform of ['linkedIn','x','instagram'])setPosted(platform,Boolean(content.posted?.[platform]));
  updateCounts();drawCard(p);$('adminLoading').hidden=true;$('contentPanel').hidden=false;clearNotice();
}

async function load(){
  try{const data=await request(CONTENT_API);render(data.content);}catch(error){$('adminLoading').hidden=true;notice(`${error.message} If you are not signed in, sign in on the Snapoki homepage first. If this is the first deploy, configure ADMIN_EMAIL in Cloudflare.`, 'error');}
}
async function save(){
  try{const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'save',headline:$('headlinePreview').textContent,linkedIn:textValue('linkedIn'),x:textValue('x'),instagram:textValue('instagram')})});render(data.content);notice('Edits saved.');}catch(error){notice(error.message,'error');}
}
async function regenerate(){
  if(!confirm('Generate a different content pack for today? Your current edits will be replaced.'))return;
  try{const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'regenerate'})});render(data.content);notice('Generated a new variation for today.');}catch(error){notice(error.message,'error');}
}
async function togglePosted(platform,button){
  try{const value=button.dataset.value!=='1';const data=await request(CONTENT_API,{method:'POST',body:JSON.stringify({action:'posted',platform,value})});render(data.content);}catch(error){notice(error.message,'error');}
}
async function remove(all=false){
  const label=all?'all stored content':'today’s content';if(!confirm(`Delete ${label}?`))return;
  try{await request(`${CONTENT_API}${all?'?all=1':''}`,{method:'DELETE'});state.content=null;$('contentPanel').hidden=true;$('contentDate').textContent='—';$('contentGame').textContent='Deleted';notice(all?'All content deleted. Opening this page again will create a fresh pack for the current day.':'Today’s pack deleted. Opening this page again will generate today again.');}catch(error){notice(error.message,'error');}
}
async function copy(platform){
  try{await navigator.clipboard.writeText(textValue(platform));notice(`${platform==='linkedIn'?'LinkedIn':platform==='x'?'X':'Instagram'} copied.`);}catch{notice('Could not access the clipboard. Select the text and copy manually.','error');}
}
function downloadCard(){
  drawCard(state.content?.payload||{});const a=document.createElement('a');a.download=`snapoki-social-${state.content?.date||'today'}.png`;a.href=$('socialCanvas').toDataURL('image/png');a.click();
}

for(const p of ['linkedIn','x','instagram'])$(`${p}Text`).addEventListener('input',()=>{updateCounts();if(state.content){state.content.payload[p]=textValue(p);drawCard(state.content.payload);}});
$('saveAllBtn').addEventListener('click',save);$('regenerateBtn').addEventListener('click',regenerate);$('deleteTodayBtn').addEventListener('click',()=>remove(false));$('deleteAllBtn').addEventListener('click',()=>remove(true));$('downloadCardBtn').addEventListener('click',downloadCard);
document.addEventListener('click',event=>{const copyBtn=event.target.closest('[data-copy]');if(copyBtn)copy(copyBtn.dataset.copy);const postedBtn=event.target.closest('[data-posted]');if(postedBtn)togglePosted(postedBtn.dataset.posted,postedBtn);});
load();
