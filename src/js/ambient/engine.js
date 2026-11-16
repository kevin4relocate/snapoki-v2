import {rngFromSeed,shuffle} from '../games/utils.js';
import {AQUARIUM_THEME} from './themes/aquarium.js';
import {createSwimmers,stepSwimmers,safeSwimSelection} from './swim.js';

const MOODS={easy:'Drift',medium:'Flow',hard:'Playful'};
const $=(root,id)=>root.querySelector('#'+id);
const safeStore=(key,value)=>{
  try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}
  catch{return null;}
};
function elapsedLabel(seconds){
  const total=Math.floor(Math.max(0,seconds));
  return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
function makeBubbles(seed){
  const random=rngFromSeed(String(seed)+':bubbles');
  return Array.from({length:18},()=>{
    const left=(5+random()*89).toFixed(2);
    const duration=(9+random()*13).toFixed(2);
    const delay=(-random()*16).toFixed(2);
    const scale=(.6+random()*1.2).toFixed(2);
    return '<i class="ambient-bubble" style="--bubble-left:'+left+'%;--bubble-duration:'+duration+'s;--bubble-delay:'+delay+'s;--bubble-scale:'+scale+'"></i>';
  }).join('');
}

export function createAmbientExperience({host,theme=AQUARIUM_THEME,difficulty='medium',seed='aquarium:preview',onMetrics=()=>{},onStatus=()=>{}}){
  if(!host||!theme.items?.length)throw new Error('Ambient theme requires a host and a populated species list.');
  let pace=MOODS[difficulty]?difficulty:'medium',selected=safeSwimSelection(theme,safeStore(theme.storageKey));
  let swimmers=[],started=false,paused=false,destroyed=false,frameId=0,lastFrame=0,seconds=0,runNumber=0;
  let audioContext=null,audioSource=null,audioGain=null,audioWanted=false,audioVolume=38,muted=false;
  let wakeLock=null;
  const index=new Map(theme.items.map(item=>[item.code,item]));
  host.innerHTML=
    '<div class="ambient-app" data-ambient-theme="'+theme.id+'">'+
      '<div class="ambient-toolbar">'+
        '<div class="ambient-brand"><span>AMBIENT LOOP</span><strong>'+theme.title+'</strong><small id="ambientSummary">A calm underwater world</small></div>'+
        '<div class="ambient-controls">'+
          '<div class="ambient-pace" role="group" aria-label="Swim speed">'+
            '<button data-pace="easy" type="button">Drift</button><button data-pace="medium" type="button">Flow</button><button data-pace="hard" type="button">Playful</button>'+
          '</div>'+
          '<button id="ambientPause" type="button">Pause</button><button id="ambientRestart" type="button">Restart</button><button id="ambientStop" type="button">■ Change</button>'+
          '<div class="ambient-audio"><button id="ambientSound" type="button" aria-pressed="false">♪ Ocean Sound</button>'+
            '<button id="ambientMute" type="button" aria-pressed="false" aria-label="Mute ocean sound" title="Mute ocean sound">🔊</button>'+
            '<label>Volume <input id="ambientVolume" type="range" min="0" max="100" value="38" aria-label="Ocean sound volume"></label>'+
          '</div>'+
          '<button id="ambientFullscreen" type="button">⛶ Full Screen</button>'+
        '</div>'+
      '</div>'+
      '<div class="ambient-scene" id="ambientScene" aria-label="Animated underwater aquarium">'+
        '<div class="ambient-light"></div>'+
        '<div class="ambient-watermark" aria-hidden="true">snapoki.com</div>'+
        '<div class="ambient-bubbles" aria-hidden="true">'+makeBubbles(seed)+'</div>'+
        '<div class="ambient-reef" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'+
        '<div id="ambientSwimmers" class="ambient-swimmers"></div>'+
        '<div id="ambientPicker" class="ambient-picker" hidden>'+
          '<div class="ambient-picker-card">'+
            '<h2>Choose 4–12 sea creatures</h2>'+
            '<div class="ambient-picker-heading"><span id="ambientSelectedCount">8 / 12 selected</span>'+
              '<div><button id="ambientRandom" type="button">Random 8</button><button id="ambientClear" type="button">Clear</button></div></div>'+
            '<div id="ambientSelected" class="ambient-selected"></div>'+
            '<label class="ambient-search-label" for="ambientSearch">Find a sea creature</label>'+
            '<input id="ambientSearch" type="search" autocomplete="off" placeholder="Search all '+theme.items.length+' sea creatures">'+
            '<div id="ambientSpeciesGrid" class="ambient-species-grid" aria-label="Sea creatures" role="group"></div>'+
            '<button id="ambientStart" class="ambient-start" type="button">Start Aquarium →</button>'+
          '</div>'+
        '</div>'+
        '<div class="ambient-scene-caption"><strong>OCEAN DRIFT</strong><span>Watch the sea creatures wander. No races, no winner.</span><em id="ambientSceneState">SCENE AWAKE</em></div>'+
      '</div>'+
      '<div class="ambient-footer" aria-live="off"><div><span>SWIMMERS</span><strong id="ambientCount">8</strong></div><div><span>FLOW</span><strong id="ambientMood">Flow</strong></div><div><span>TIME IN THE OCEAN</span><strong id="ambientElapsed">00:00</strong></div></div>'+
    '</div>';
  const app=host.querySelector('.ambient-app'),scene=$(app,'ambientScene'),layer=$(app,'ambientSwimmers'),picker=$(app,'ambientPicker');
  const randomButton=$(app,'ambientRandom'),clearButton=$(app,'ambientClear'),startButton=$(app,'ambientStart'),search=$(app,'ambientSearch');
  const selectedHost=$(app,'ambientSelected'),speciesGrid=$(app,'ambientSpeciesGrid'),countLabel=$(app,'ambientSelectedCount');
  const pauseButton=$(app,'ambientPause'),restartButton=$(app,'ambientRestart'),stopButton=$(app,'ambientStop');
  const soundButton=$(app,'ambientSound'),muteButton=$(app,'ambientMute'),volumeInput=$(app,'ambientVolume');
  const fullscreenButton=$(app,'ambientFullscreen'),paceButtons=[...app.querySelectorAll('[data-pace]')];
  const audioAvailable=Boolean(window.AudioContext||window.webkitAudioContext);
  const listeners=[];
  const listen=(element,event,handler)=>{element.addEventListener(event,handler);listeners.push(()=>element.removeEventListener(event,handler));};

  function renderSpecies(){
    speciesGrid.replaceChildren();
    const query=search.value.trim().toLocaleLowerCase('en');
    for(const item of theme.items){
      if(query&&!item.name.toLocaleLowerCase('en').includes(query)&&!item.code.toLocaleLowerCase('en').includes(query))continue;
      const button=document.createElement('button');
      button.type='button';button.className='ambient-species-choice';
      button.dataset.code=item.code;button.setAttribute('aria-pressed',String(selected.includes(item.code)));
      button.disabled=!selected.includes(item.code)&&selected.length>=12;
      const emoji=document.createElement('span');emoji.textContent=item.emoji;
      const name=document.createElement('strong');name.textContent=item.name;
      const status=document.createElement('i');status.textContent=selected.includes(item.code)?'✓':'+';
      button.append(emoji,name,status);
      speciesGrid.appendChild(button);
    }
    if(!speciesGrid.children.length){
      const empty=document.createElement('p');empty.className='ambient-search-empty';empty.textContent='No matching sea creatures.';
      speciesGrid.appendChild(empty);
    }
  }
  function renderSelection(){
    selectedHost.replaceChildren();
    for(const code of selected){
      const item=index.get(code);if(!item)continue;
      const chip=document.createElement('button');
      chip.type='button';chip.className='ambient-selected-chip';chip.dataset.code=code;
      chip.setAttribute('aria-label','Remove '+item.name);
      const emoji=document.createElement('span');emoji.textContent=item.emoji;
      const name=document.createElement('strong');name.textContent=item.name;
      const close=document.createElement('i');close.textContent='×';
      chip.append(emoji,name,close);selectedHost.appendChild(chip);
    }
    countLabel.textContent=selected.length+' / 12 selected';
    startButton.disabled=selected.length<4||selected.length>12;
    renderSpecies();
  }
  function setSelected(code){
    if(!index.has(code))return;
    if(selected.includes(code))selected=selected.filter(value=>value!==code);
    else if(selected.length<12)selected=[...selected,code];
    renderSelection();
  }
  function renderSwimmers(){
    layer.replaceChildren();
    for(const swimmer of swimmers){
      const item=document.createElement('div');item.className='ambient-swimmer';
      item.dataset.code=swimmer.code;item.style.setProperty('--depth',String(swimmer.depth));
      const creature=document.createElement('span');creature.className='ambient-swimmer-icon';creature.textContent=swimmer.emoji;
      const label=document.createElement('span');label.className='ambient-swimmer-label';label.textContent=swimmer.name;
      item.append(creature,label);layer.appendChild(item);
      swimmer.element=item;swimmer.icon=creature;swimmer.facing=0;
    }
    paintSwimmers();
  }
  function paintSwimmers(){
    for(const swimmer of swimmers){
      const item=swimmer.element;if(!item)continue;
      item.style.left=(swimmer.x*100).toFixed(3)+'%';
      item.style.top=(swimmer.y*100).toFixed(3)+'%';
      item.style.transform='translate(-50%,-50%) scale('+(swimmer.size*swimmer.depth).toFixed(2)+') rotate('+swimmer.angle.toFixed(2)+'deg)';
      // Most side-view fish emoji point left. Flip the icon only, never the text label.
      if(Math.abs(swimmer.vx)>.004)swimmer.facing=swimmer.vx>0?1:-1;
      swimmer.icon.style.transform=swimmer.facing===1?'scaleX(-1)':'none';
    }
  }
  function updateUi(){
    paceButtons.forEach(button=>{
      const active=button.dataset.pace===pace;button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const enabled=started&&!destroyed;
    pauseButton.disabled=!enabled;restartButton.disabled=!enabled;
    stopButton.disabled=!enabled;fullscreenButton.disabled=!enabled;
    pauseButton.textContent=paused?'Resume':'Pause';
    soundButton.disabled=!audioAvailable;soundButton.setAttribute('aria-pressed',String(audioWanted));
    soundButton.title=audioWanted?'Pause ocean sound':'Play ocean sound';
    soundButton.setAttribute('aria-label',audioWanted?'Pause ocean sound':'Play ocean sound');
    muteButton.disabled=!audioAvailable;muteButton.setAttribute('aria-pressed',String(muted));
    muteButton.textContent=muted?'🔇':'🔊';
    $(app,'ambientCount').textContent=String(swimmers.length);
    $(app,'ambientMood').textContent=MOODS[pace];
    $(app,'ambientSummary').textContent=swimmers.length+' sea creatures · '+MOODS[pace]+' · ambient swim';
    $(app,'ambientSceneState').textContent=!started?'CHOOSE CREATURES':paused?'SCENE PAUSED':'SCENE AWAKE';
    fullscreenButton.textContent=document.fullscreenElement===app?'⛶ Exit Full Screen':'⛶ Full Screen';
  }
  function updateElapsed(){
    $(app,'ambientElapsed').textContent=elapsedLabel(seconds);
    onMetrics({swimmers:swimmers.length,time:elapsedLabel(seconds),flow:MOODS[pace],scene:'Aquarium'});
  }
  function haltFrame(){if(frameId){cancelAnimationFrame(frameId);frameId=0;}lastFrame=0;}
  function scheduleFrame(){
    if(!frameId&&started&&!paused&&!destroyed&&document.visibilityState!=='hidden')
      frameId=requestAnimationFrame(frame);
  }
  function frame(now){
    frameId=0;
    if(!started||paused||destroyed||document.visibilityState==='hidden')return;
    const dt=lastFrame?Math.min(.05,Math.max(0,(now-lastFrame)/1000)):0;
    lastFrame=now;
    if(dt){
      stepSwimmers(swimmers,dt,pace);
      seconds+=dt;paintSwimmers();
    }
    if(Math.floor(seconds)!==Math.floor(seconds-dt))updateElapsed();
    scheduleFrame();
  }
  function suspendSound(){if(audioContext?.state==='running')void audioContext.suspend().catch(()=>{});}
  function resumeSound(){if(audioWanted&&started&&!paused&&document.visibilityState!=='hidden'&&audioContext?.state==='suspended')void audioContext.resume().catch(()=>{});}
  async function ensureSound(){
    if(audioContext)return;
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Web Audio unsupported');
    const ctx=new Context(),length=Math.max(1024,Math.floor(ctx.sampleRate*3));
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
    const rand=rngFromSeed('snapoki:original-ocean-ambience:v1');let last=0;
    for(let i=0;i<length;i++){
      const white=rand()*2-1;last=(last+.055*white)/1.055;
      data[i]=last*.62;
    }
    const src=ctx.createBufferSource();src.buffer=buffer;src.loop=true;
    const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=380;
    const gain=ctx.createGain();gain.gain.value=0;
    src.connect(low);low.connect(gain);gain.connect(ctx.destination);src.start();
    audioContext=ctx;audioSource=src;audioGain=gain;
  }
  async function applyAudio(){
    if(destroyed)return;
    try{
      if(audioWanted&&started&&!paused){
        await ensureSound();
        if(audioContext.state==='suspended')await audioContext.resume();
        audioGain.gain.setTargetAtTime(muted?0:audioVolume/100*.09,audioContext.currentTime,.12);
      }else if(audioContext){
        audioGain.gain.setTargetAtTime(0,audioContext.currentTime,.09);
        suspendSound();
      }
    }catch{
      audioWanted=false;
      onStatus('Ocean sound is unavailable in this browser; the aquarium still works.');
    }
    updateUi();
  }
  async function requestWakeLock(){
    if(!started||paused||document.visibilityState==='hidden'||document.fullscreenElement!==app||!navigator.wakeLock?.request)return;
    try{wakeLock=await navigator.wakeLock.request('screen');}catch{wakeLock=null;}
  }
  function releaseWakeLock(){if(wakeLock){void wakeLock.release().catch(()=>{});wakeLock=null;}}
  function startSwim(resetSelection=false){
    if(destroyed||selected.length<4||selected.length>12)return;
    haltFrame();runNumber++;seconds=0;
    safeStore(theme.storageKey,JSON.stringify(selected));
    const animals=selected.map(code=>index.get(code)).filter(Boolean);
    swimmers=createSwimmers(animals,String(seed)+':session:'+runNumber);
    started=true;paused=false;picker.hidden=true;renderSwimmers();updateUi();updateElapsed();scheduleFrame();
    resumeSound();void applyAudio();void requestWakeLock();
    onStatus('A peaceful, endless aquarium is swimming. There is no winner or finish line.');
    if(resetSelection)search.value='';
  }
  function pauseResume(){
    if(!started)return;
    paused=!paused;haltFrame();
    if(paused){suspendSound();releaseWakeLock();}
    else{scheduleFrame();resumeSound();void requestWakeLock();}
    updateUi();onStatus(paused?'Aquarium paused.':'Aquarium swimming again.');
  }
  function stop(){
    if(!started)return;
    haltFrame();started=false;paused=false;
    picker.hidden=false;suspendSound();releaseWakeLock();renderSelection();
    updateUi();onStatus('Choose 4–12 sea creatures, then start the aquarium.');
  }
  async function toggleFullscreen(){
    if(!started)return;
    try{
      if(document.fullscreenElement===app)await document.exitFullscreen();
      else if(!document.fullscreenElement)await app.requestFullscreen();
      updateUi();if(document.fullscreenElement===app)void requestWakeLock();else releaseWakeLock();
    }catch{onStatus('Full Screen is unavailable in this browser.');}
  }
  function visibilityChange(){
    if(document.visibilityState==='hidden'){haltFrame();suspendSound();releaseWakeLock();}
    else if(started&&!paused){scheduleFrame();resumeSound();void requestWakeLock();}
  }
  listen(startButton,'click',()=>startSwim(true));
  listen(pauseButton,'click',pauseResume);
  listen(restartButton,'click',()=>{if(started)startSwim();});
  listen(stopButton,'click',stop);
  listen(randomButton,'click',()=>{
    selected=shuffle(theme.items,Math.random).slice(0,8).map(item=>item.code);
    renderSelection();
  });
  listen(clearButton,'click',()=>{selected=[];renderSelection();});
  listen(search,'input',renderSpecies);
  listen(speciesGrid,'click',event=>{
    const button=event.target.closest('[data-code]');
    if(button&&!button.disabled)setSelected(button.dataset.code);
  });
  listen(selectedHost,'click',event=>{
    const button=event.target.closest('[data-code]');if(button)setSelected(button.dataset.code);
  });
  for(const button of paceButtons)listen(button,'click',()=>{
    pace=button.dataset.pace;updateUi();onStatus('Swim pace: '+MOODS[pace]+'. The scene continues without resetting.');
  });
  listen(soundButton,'click',()=>{audioWanted=!audioWanted;void applyAudio();});
  listen(muteButton,'click',()=>{muted=!muted;void applyAudio();});
  listen(volumeInput,'input',()=>{audioVolume=Math.max(0,Math.min(100,Number(volumeInput.value)||0));void applyAudio();});
  listen(fullscreenButton,'click',()=>{void toggleFullscreen();});
  listen(document,'visibilitychange',visibilityChange);
  listen(document,'fullscreenchange',()=>{updateUi();if(document.fullscreenElement!==app)releaseWakeLock();});
  selected=selected.slice(0,12);renderSelection();startSwim();
  return {
    reset(){if(started)startSwim();},
    setDifficulty(next){if(MOODS[next]){pace=next;updateUi();}},
    destroy(){
      if(destroyed)return;
      destroyed=true;haltFrame();releaseWakeLock();
      listeners.forEach(remove=>remove());
      if(document.fullscreenElement===app)void document.exitFullscreen().catch(()=>{});
      if(audioSource)try{audioSource.stop();}catch{}
      if(audioContext)void audioContext.close().catch(()=>{});
      host.replaceChildren();
    }
  };
}
