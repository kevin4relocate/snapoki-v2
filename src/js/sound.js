const STORAGE_KEY='snapoki:sound:v1';
const DEFAULT_VOLUME=.34;

let context=null;
let enabled=readEnabled();
let lastBoardSoundAt=0;

function readEnabled(){
  try{return localStorage.getItem(STORAGE_KEY)!=='off';}catch{return true;}
}
function writeEnabled(value){
  try{localStorage.setItem(STORAGE_KEY,value?'on':'off');}catch{}
}
function audioContext(){
  if(context)return context;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return null;
  context=new AudioContextClass();
  return context;
}
function envelope(gain,now,volume,duration){
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
}
function tone({frequency=440,endFrequency=frequency,duration=.08,volume=.07,type='sine',delay=0}={}){
  if(!enabled)return;
  const ctx=audioContext();if(!ctx)return;
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  const now=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),now+duration);
  envelope(gain,now,volume*DEFAULT_VOLUME,duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.02);
}
function chord(notes,options={}){notes.forEach((frequency,index)=>tone({...options,frequency,endFrequency:frequency,delay:(options.delay||0)+index*.055}));}

const sounds={
  tap:()=>tone({frequency:620,endFrequency:560,duration:.055,volume:.11,type:'sine'}),
  move:()=>tone({frequency:470,endFrequency:520,duration:.06,volume:.09,type:'triangle'}),
  connect:()=>chord([520,660],{duration:.09,volume:.09,type:'sine'}),
  error:()=>tone({frequency:210,endFrequency:150,duration:.12,volume:.11,type:'triangle'}),
  hint:()=>chord([720,880],{duration:.11,volume:.085,type:'sine'}),
  complete:()=>chord([523.25,659.25,783.99],{duration:.16,volume:.105,type:'sine'}),
  'daily-complete':()=>chord([587.33,739.99,880,1174.66],{duration:.18,volume:.095,type:'sine'}),
  'new-puzzle':()=>tone({frequency:360,endFrequency:560,duration:.11,volume:.085,type:'triangle'})
};

export const SnapokiSound={
  play(name){try{sounds[name]?.();}catch(error){console.warn('Sound playback unavailable',error);}},
  isEnabled(){return enabled;},
  setEnabled(value){enabled=Boolean(value);writeEnabled(enabled);updateToggle();if(enabled)this.play('tap');return enabled;},
  toggle(){return this.setEnabled(!enabled);}
};

function ensureStyle(){
  if(document.querySelector('#snapokiSoundStyle'))return;
  const style=document.createElement('style');style.id='snapokiSoundStyle';style.textContent=`
.sound-toggle{width:40px;height:40px;border:1px solid var(--border);border-radius:999px;background:#11182a;color:var(--muted);display:grid;place-items:center;cursor:pointer;flex:0 0 40px;transition:border-color .15s ease,background .15s ease,color .15s ease,transform .15s ease}
.sound-toggle:hover{border-color:#6656d9;background:var(--surface-2);color:var(--text);transform:translateY(-1px)}
.sound-toggle[aria-pressed="false"]{opacity:.72}
.sound-toggle svg{width:18px;height:18px;display:block}
@media(max-width:900px){.sound-toggle{width:38px;height:38px;flex-basis:38px}}
`;document.head.appendChild(style);
}
function iconMarkup(){
  return enabled?'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.1-3.8v7.6a4.5 4.5 0 0 0 2.1-3.8Zm-2.1-8.3v2.1a7 7 0 0 1 0 12.4v2.1a9 9 0 0 0 0-16.6Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4Zm11.6 1.6 1.9-1.9 1.4 1.4-1.9 1.9 1.9 1.9-1.4 1.4-1.9-1.9-1.9 1.9-1.4-1.4 1.9-1.9-1.9-1.9 1.4-1.4 1.9 1.9Z"/></svg>';
}
function updateToggle(){
  const button=document.querySelector('#soundToggle');if(!button)return;
  button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'Turn sound off':'Turn sound on');button.title=enabled?'Sound on':'Sound off';button.innerHTML=iconMarkup();
}
function ensureToggle(){
  if(document.querySelector('#soundToggle'))return;
  const actions=document.querySelector('.header-actions');if(!actions)return;
  const button=document.createElement('button');button.id='soundToggle';button.className='sound-toggle';button.type='button';
  const account=document.querySelector('#accountSlot');actions.insertBefore(button,account||actions.firstChild);updateToggle();
  button.addEventListener('click',event=>{event.stopPropagation();SnapokiSound.toggle();});
}
function setupControlSounds(){
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');if(!target||target.id==='soundToggle'||target.disabled)return;
    if(target.id==='hint'){SnapokiSound.play('hint');return;}
    if(target.id==='solution'){SnapokiSound.play('hint');return;}
    if(target.id==='newPuzzle'||target.id==='resetPuzzle'||target.id==='resultNew'||target.id==='resultAgain'||target.id==='resultNext'||target.id==='resultClose'){SnapokiSound.play('new-puzzle');return;}
    if(target.matches('.difficulty-button,.mode-button,.daily-level')){SnapokiSound.play('tap');return;}
  },{passive:true});
  const board=document.querySelector('#gameBoard');
  board?.addEventListener('pointerup',event=>{
    if(event.target.closest('button,a,input,select,textarea'))return;
    const now=performance.now();if(now-lastBoardSoundAt<55)return;lastBoardSoundAt=now;SnapokiSound.play('move');
  },{passive:true});
}
function setupCompletionSound(){
  const modal=document.querySelector('#resultModal');if(!modal)return;
  let wasOpen=!modal.hidden;
  new MutationObserver(()=>{const open=!modal.hidden;if(open&&!wasOpen)SnapokiSound.play('complete');wasOpen=open;}).observe(modal,{attributes:true,attributeFilter:['hidden']});
  const status=document.querySelector('#resultSaveStatus');if(status){
    let dailyPlayed=false;
    new MutationObserver(()=>{
      const daily=/Daily complete/i.test(status.textContent||'');
      if(daily&&!dailyPlayed){dailyPlayed=true;setTimeout(()=>SnapokiSound.play('daily-complete'),220);}else if(!daily)dailyPlayed=false;
    }).observe(status,{childList:true,characterData:true,subtree:true});
  }
}

export function setupSoundSystem(){
  ensureStyle();ensureToggle();setupControlSounds();setupCompletionSound();window.SnapokiSound=SnapokiSound;
}
