import {clamp,rngFromSeed,shuffle} from './utils.js';

const WORLD_LOOP_COUNTRY_DATA=[
  ['AF',"Afghanistan"],
  ['AL',"Albania"],
  ['DZ',"Algeria"],
  ['AD',"Andorra"],
  ['AO',"Angola"],
  ['AG',"Antigua and Barbuda"],
  ['AR',"Argentina"],
  ['AM',"Armenia"],
  ['AU',"Australia"],
  ['AT',"Austria"],
  ['AZ',"Azerbaijan"],
  ['BS',"Bahamas"],
  ['BH',"Bahrain"],
  ['BD',"Bangladesh"],
  ['BB',"Barbados"],
  ['BY',"Belarus"],
  ['BE',"Belgium"],
  ['BZ',"Belize"],
  ['BJ',"Benin"],
  ['BT',"Bhutan"],
  ['BO',"Bolivia"],
  ['BA',"Bosnia and Herzegovina"],
  ['BW',"Botswana"],
  ['BR',"Brazil"],
  ['BN',"Brunei"],
  ['BG',"Bulgaria"],
  ['BF',"Burkina Faso"],
  ['BI',"Burundi"],
  ['CV',"Cabo Verde"],
  ['KH',"Cambodia"],
  ['CM',"Cameroon"],
  ['CA',"Canada"],
  ['CF',"Central African Republic"],
  ['TD',"Chad"],
  ['CL',"Chile"],
  ['CN',"China"],
  ['CO',"Colombia"],
  ['KM',"Comoros"],
  ['CG',"Congo"],
  ['CD',"DR Congo"],
  ['CR',"Costa Rica"],
  ['CI',"Côte d'Ivoire"],
  ['HR',"Croatia"],
  ['CU',"Cuba"],
  ['CY',"Cyprus"],
  ['CZ',"Czechia"],
  ['DK',"Denmark"],
  ['DJ',"Djibouti"],
  ['DM',"Dominica"],
  ['DO',"Dominican Republic"],
  ['EC',"Ecuador"],
  ['EG',"Egypt"],
  ['SV',"El Salvador"],
  ['GQ',"Equatorial Guinea"],
  ['ER',"Eritrea"],
  ['EE',"Estonia"],
  ['SZ',"Eswatini"],
  ['ET',"Ethiopia"],
  ['FJ',"Fiji"],
  ['FI',"Finland"],
  ['FR',"France"],
  ['GA',"Gabon"],
  ['GM',"Gambia"],
  ['GE',"Georgia"],
  ['DE',"Germany"],
  ['GH',"Ghana"],
  ['GR',"Greece"],
  ['GD',"Grenada"],
  ['GT',"Guatemala"],
  ['GN',"Guinea"],
  ['GW',"Guinea-Bissau"],
  ['GY',"Guyana"],
  ['HT',"Haiti"],
  ['VA',"Vatican City"],
  ['HN',"Honduras"],
  ['HU',"Hungary"],
  ['IS',"Iceland"],
  ['IN',"India"],
  ['ID',"Indonesia"],
  ['IR',"Iran"],
  ['IQ',"Iraq"],
  ['IE',"Ireland"],
  ['IL',"Israel"],
  ['IT',"Italy"],
  ['JM',"Jamaica"],
  ['JP',"Japan"],
  ['JO',"Jordan"],
  ['KZ',"Kazakhstan"],
  ['KE',"Kenya"],
  ['KI',"Kiribati"],
  ['KP',"North Korea"],
  ['KR',"South Korea"],
  ['KW',"Kuwait"],
  ['KG',"Kyrgyzstan"],
  ['LA',"Laos"],
  ['LV',"Latvia"],
  ['LB',"Lebanon"],
  ['LS',"Lesotho"],
  ['LR',"Liberia"],
  ['LY',"Libya"],
  ['LI',"Liechtenstein"],
  ['LT',"Lithuania"],
  ['LU',"Luxembourg"],
  ['MG',"Madagascar"],
  ['MW',"Malawi"],
  ['MY',"Malaysia"],
  ['MV',"Maldives"],
  ['ML',"Mali"],
  ['MT',"Malta"],
  ['MH',"Marshall Islands"],
  ['MR',"Mauritania"],
  ['MU',"Mauritius"],
  ['MX',"Mexico"],
  ['FM',"Micronesia"],
  ['MD',"Moldova"],
  ['MC',"Monaco"],
  ['MN',"Mongolia"],
  ['ME',"Montenegro"],
  ['MA',"Morocco"],
  ['MZ',"Mozambique"],
  ['MM',"Myanmar"],
  ['NA',"Namibia"],
  ['NR',"Nauru"],
  ['NP',"Nepal"],
  ['NL',"Netherlands"],
  ['NZ',"New Zealand"],
  ['NI',"Nicaragua"],
  ['NE',"Niger"],
  ['NG',"Nigeria"],
  ['MK',"North Macedonia"],
  ['NO',"Norway"],
  ['OM',"Oman"],
  ['PK',"Pakistan"],
  ['PW',"Palau"],
  ['PS',"Palestine"],
  ['PA',"Panama"],
  ['PG',"Papua New Guinea"],
  ['PY',"Paraguay"],
  ['PE',"Peru"],
  ['PH',"Philippines"],
  ['PL',"Poland"],
  ['PT',"Portugal"],
  ['QA',"Qatar"],
  ['RO',"Romania"],
  ['RU',"Russia"],
  ['RW',"Rwanda"],
  ['KN',"Saint Kitts and Nevis"],
  ['LC',"Saint Lucia"],
  ['VC',"Saint Vincent and the Grenadines"],
  ['WS',"Samoa"],
  ['SM',"San Marino"],
  ['ST',"São Tomé and Príncipe"],
  ['SA',"Saudi Arabia"],
  ['SN',"Senegal"],
  ['RS',"Serbia"],
  ['SC',"Seychelles"],
  ['SL',"Sierra Leone"],
  ['SG',"Singapore"],
  ['SK',"Slovakia"],
  ['SI',"Slovenia"],
  ['SB',"Solomon Islands"],
  ['SO',"Somalia"],
  ['ZA',"South Africa"],
  ['SS',"South Sudan"],
  ['ES',"Spain"],
  ['LK',"Sri Lanka"],
  ['SD',"Sudan"],
  ['SR',"Suriname"],
  ['SE',"Sweden"],
  ['CH',"Switzerland"],
  ['SY',"Syria"],
  ['TW',"Taiwan"],
  ['TJ',"Tajikistan"],
  ['TZ',"Tanzania"],
  ['TH',"Thailand"],
  ['TL',"Timor-Leste"],
  ['TG',"Togo"],
  ['TO',"Tonga"],
  ['TT',"Trinidad and Tobago"],
  ['TN',"Tunisia"],
  ['TR',"Türkiye"],
  ['TM',"Turkmenistan"],
  ['TV',"Tuvalu"],
  ['UG',"Uganda"],
  ['UA',"Ukraine"],
  ['AE',"United Arab Emirates"],
  ['GB',"United Kingdom"],
  ['US',"United States"],
  ['UY',"Uruguay"],
  ['UZ',"Uzbekistan"],
  ['VU',"Vanuatu"],
  ['VE',"Venezuela"],
  ['VN',"Vietnam"],
  ['YE',"Yemen"],
  ['ZM',"Zambia"],
  ['ZW',"Zimbabwe"]
];
function flagFromCode(code){return [...code.toUpperCase()].map(char=>String.fromCodePoint(127397+char.charCodeAt(0))).join('');}
export const WORLD_LOOP_COUNTRIES=WORLD_LOOP_COUNTRY_DATA.map(([code,name])=>({code,name,flag:flagFromCode(code)}));
const COUNTRY_MAP=new Map(WORLD_LOOP_COUNTRIES.map(country=>[country.code,country]));
export const WORLD_LOOP_PICKER_COUNTRIES=[...WORLD_LOOP_COUNTRIES].sort((a,b)=>a.code==='VN'?1:b.code==='VN'?-1:a.name.localeCompare(b.name,'en'));
export function sortWorldLoopCodes(codes=[]){return [...codes].filter(code=>COUNTRY_MAP.has(code)).sort((a,b)=>a==='VN'?1:b==='VN'?-1:COUNTRY_MAP.get(a).name.localeCompare(COUNTRY_MAP.get(b).name,'en'));}
export function restoreWorldLoopSelection(raw){
  let stored;
  try{stored=JSON.parse(raw||'[]');}catch{stored=[];}
  const valid=Array.isArray(stored)?stored.filter(code=>typeof code==='string'&&COUNTRY_MAP.has(code)):[];
  const codes=sortWorldLoopCodes([...new Set(valid)].slice(0,12));
  return codes.length>=4?codes:sortWorldLoopCodes(DEFAULT_CODES);
}
export const WORLD_LOOP_MASCOTS=['🏎️','🚀','🐇','🦊','🤖','🛸','🐝','⚡','🐲','🦅','🐬','🦖'];
const WORLD_LOOP_FACE_RIGHT_MASCOTS=new Set(['🐇','🦊','🐝','🐲','🦅','🐬','🦖']);

const LEVEL={
  easy:{base:12.5,variance:.52,catchup:.046,maxCatchup:2.7,burst:1.7,burstChance:.032},
  medium:{base:15.5,variance:.78,catchup:.056,maxCatchup:3.8,burst:2.5,burstChance:.046},
  hard:{base:18.5,variance:1.05,catchup:.066,maxCatchup:4.9,burst:3.3,burstChance:.064}
};
const DEFAULT_CODES=['VN','JP','US','BR','FR','KR','DE','GB'];
export const WORLD_LOOP_AUDIO_SRC='/audio/world-loop/endless-circuit.mp3';
export const WORLD_LOOP_CROSSFADE_SECONDS=10;
const WORLD_LOOP_AUDIO_DEFAULT_VOLUME=.55;
const WORLD_LOOP_AUDIO_SCHEDULE_AHEAD=25;

export function buildWorldLoopRoster(codes=DEFAULT_CODES,seed='world-loop:preview',difficulty='medium'){
  const cfg=LEVEL[difficulty]||LEVEL.medium,rng=rngFromSeed(String(seed)+':roster:v4');
  return codes.map((code,index)=>{
    const country=COUNTRY_MAP.get(code)||WORLD_LOOP_COUNTRIES[index%WORLD_LOOP_COUNTRIES.length];
    return{
      code:country.code,flag:country.flag,name:country.name,index,
      baseSpeed:cfg.base*(.985+rng()*.03),
      acceleration:.90+rng()*.20,
      burstSkill:.88+rng()*.24,
      phase:rng()*Math.PI*2,
      mascot:WORLD_LOOP_MASCOTS[Math.floor(rng()*WORLD_LOOP_MASCOTS.length)]
    };
  });
}
export function worldLoopOrder(racers=[]){return [...racers].sort((a,b)=>Number(b.distance||0)-Number(a.distance||0)||a.index-b.index);}
export function worldLoopGap(racers=[]){
  const ordered=worldLoopOrder(racers);
  return ordered.length>1?Math.max(0,(Number(ordered[0].distance)||0)-(Number(ordered[1].distance)||0)):0;
}
export function formatWorldLoopDistance(meters=0){
  const m=Math.max(0,Number(meters)||0);
  if(m<1000)return Math.floor(m).toLocaleString('en-US')+' m';
  const km=m/1000;
  if(km<100)return km.toFixed(1)+' km';
  if(km<1000000)return Math.floor(km).toLocaleString('en-US')+' km';
  return (km/1000000).toFixed(2)+'M km';
}
export function generateWorldLoop(difficulty='medium',seed='world-loop'){
  return{difficulty,seed,racers:buildWorldLoopRoster(DEFAULT_CODES,seed,difficulty),endless:true};
}

function storageGet(key){try{return localStorage.getItem(key);}catch{return null;}}
function storageSet(key,value){try{localStorage.setItem(key,value);}catch{}}
function formatElapsed(ms=0){
  const total=Math.max(0,Math.floor(ms/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;
  return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

export function createGame({host,difficulty='medium',seed='world-loop:medium:preview',onMetrics=()=>{},onStatus=()=>{}}){
  let cfg=LEVEL[difficulty]||LEVEL.medium;const rosterStore='snapoki:world-loop:roster:v1';
  let selected=new Set(),racers=[],sessionRng=rngFromSeed(String(seed)+':endless:v4'),running=false,started=false,raf=0,lastFrame=0,elapsedMs=0,lastHudAt=-Infinity,restartCounter=0,wakeLock=null;
  let cameraDistance=0,leaderCode='',leadChanges=0,fullscreenListener=null,visibilityListener=null,pickerDocumentListener=null;
  let audioContext=null,audioBuffer=null,audioMasterGain=null,audioNextStartTime=0,audioScheduleIndex=0,audioUserPlaying=false,audioPausedByRace=false,audioLoading=false,audioMuted=false,audioVolume=WORLD_LOOP_AUDIO_DEFAULT_VOLUME;
  const audioSources=new Set();

  host.innerHTML='<div class="world-loop-app">'+
    '<div class="world-loop-racebar"><div class="world-loop-title"><span class="world-loop-live"><i></i> ENDLESS RACE</span><strong>World Loop</strong><small id="worldLoopRaceMeta"></small></div><div class="world-loop-race-actions"><button id="worldLoopPause" type="button" disabled>Pause</button><button id="worldLoopRestart" type="button" disabled>Restart</button><button id="worldLoopChange" type="button" disabled>■ Stop</button><div class="world-loop-audio-controls" aria-label="Background music"><button id="worldLoopSoundToggle" class="world-loop-sound-toggle" type="button" disabled>♪ Play Sound</button><button id="worldLoopSoundMute" class="world-loop-sound-mute" type="button" aria-pressed="false" title="Mute sound" disabled>🔊</button><label class="world-loop-volume" title="Music volume"><input id="worldLoopVolume" type="range" min="0" max="100" step="1" value="55" aria-label="Music volume" disabled><span id="worldLoopVolumeValue">55%</span></label></div><button id="worldLoopFullscreen" class="world-loop-fullscreen" type="button" aria-pressed="false" disabled>⛶ Full Screen</button></div></div>'+
    '<div class="world-loop-orderbar"><div class="world-loop-order-label"><span>CURRENT ORDER</span><small id="worldLoopLeaderLabel">NO FINISH LINE</small></div><ol id="worldLoopOrder"></ol></div>'+
    '<div class="world-loop-viewport"><div class="world-loop-track-top"><div><span>ENDLESS TRACK →</span><small id="worldLoopTrackDetail">Distance keeps increasing until you restart.</small></div><div id="worldLoopWake" class="world-loop-wake">SCREEN MODE</div></div><div id="worldLoopLanes" class="world-loop-lanes" aria-label="Endless lane race"></div>'+
      '<div id="worldLoopSetup" class="world-loop-setup"><div class="world-loop-setup-card"><h2>Pick 4–12 countries</h2><div class="world-loop-pick-head"><strong id="worldLoopPickCount">0 / 12 selected</strong><div><button id="worldLoopRandom" type="button">Random 8</button><button id="worldLoopClear" type="button">Clear</button></div></div><div id="worldLoopSelected" class="world-loop-selected"></div><div id="worldLoopCountryPicker" class="world-loop-country-picker"><button id="worldLoopAddCountry" class="world-loop-country-trigger" type="button" aria-controls="worldLoopCountryMenu" aria-expanded="false"><b>+ Add country</b><span>Search 196 countries</span></button><div id="worldLoopCountryMenu" class="world-loop-country-menu" hidden><input id="worldLoopCountrySearch" type="search" autocomplete="off" placeholder="Search country or code" aria-label="Search countries"><div id="worldLoopCountryOptions" class="world-loop-country-options"></div></div></div><button id="worldLoopStart" class="world-loop-start" type="button">Start Endless Race →</button></div></div>'+    '</div>'+
    '<div class="world-loop-story-grid"><article><span>CURRENT LEADER</span><strong id="worldLoopLeader">—</strong><small id="worldLoopLeaderMeta">Waiting for the race to start.</small></article><article><span>P1 → P2 GAP</span><strong id="worldLoopGap">0 m</strong><small id="worldLoopChanges">0 lead changes</small></article><article><span>SESSION</span><strong id="worldLoopSession">00:00</strong><small>Distance never resets automatically.</small></article></div>'+
  '</div>';

  const app=host.querySelector('.world-loop-app'),lanesHost=host.querySelector('#worldLoopLanes'),setup=host.querySelector('#worldLoopSetup'),selectedHost=host.querySelector('#worldLoopSelected'),pickCount=host.querySelector('#worldLoopPickCount');
  const startButton=host.querySelector('#worldLoopStart'),pauseButton=host.querySelector('#worldLoopPause'),restartButton=host.querySelector('#worldLoopRestart'),changeButton=host.querySelector('#worldLoopChange'),fullscreenButton=host.querySelector('#worldLoopFullscreen'),soundToggleButton=host.querySelector('#worldLoopSoundToggle'),soundMuteButton=host.querySelector('#worldLoopSoundMute'),volumeSlider=host.querySelector('#worldLoopVolume'),volumeValue=host.querySelector('#worldLoopVolumeValue'),randomButton=host.querySelector('#worldLoopRandom'),clearButton=host.querySelector('#worldLoopClear'),pickerWrap=host.querySelector('#worldLoopCountryPicker'),addCountryButton=host.querySelector('#worldLoopAddCountry'),countryMenu=host.querySelector('#worldLoopCountryMenu'),countrySearch=host.querySelector('#worldLoopCountrySearch'),countryOptions=host.querySelector('#worldLoopCountryOptions');
  const orderHost=host.querySelector('#worldLoopOrder'),leaderLabel=host.querySelector('#worldLoopLeaderLabel'),raceMeta=host.querySelector('#worldLoopRaceMeta'),wakeHost=host.querySelector('#worldLoopWake'),leaderHost=host.querySelector('#worldLoopLeader'),leaderMeta=host.querySelector('#worldLoopLeaderMeta'),gapHost=host.querySelector('#worldLoopGap'),changesHost=host.querySelector('#worldLoopChanges'),sessionHost=host.querySelector('#worldLoopSession');

  function loadSelection(){
    selected=new Set(restoreWorldLoopSelection(storageGet(rosterStore)));
  }
  function saveSelection(){storageSet(rosterStore,JSON.stringify([...selected]));}
  function closeCountryMenu(){
    countryMenu.hidden=true;addCountryButton.setAttribute('aria-expanded','false');countrySearch.value='';
  }
  function renderCountryOptions(){
    const query=countrySearch.value.trim().toLocaleLowerCase('en');
    const matches=WORLD_LOOP_PICKER_COUNTRIES.filter(country=>!query||country.name.toLocaleLowerCase('en').includes(query)||country.code.toLocaleLowerCase('en').includes(query));
    countryOptions.innerHTML='';
    if(!matches.length){countryOptions.innerHTML='<div class="world-loop-country-empty">No countries found.</div>';return;}
    for(const country of matches){
      const button=document.createElement('button'),isSelected=selected.has(country.code);
      button.type='button';button.className='world-loop-country-option'+(isSelected?' selected':'');button.dataset.code=country.code;button.setAttribute('aria-pressed',String(isSelected));button.innerHTML='<span>'+country.flag+'</span><strong class="world-loop-country-name">'+country.name+'</strong><small>'+country.code+'</small><i>'+(isSelected?'✓':'')+'</i>';
      button.addEventListener('click',()=>{if(isSelected)selected.delete(country.code);else if(selected.size<12)selected.add(country.code);renderPicker();const replacement=[...countryOptions.querySelectorAll('button')].find(option=>option.dataset.code===country.code);if(replacement&&!addCountryButton.disabled)replacement.focus();else{closeCountryMenu();addCountryButton.focus();}});
      countryOptions.appendChild(button);
    }
  }
  function renderPicker(){
    selectedHost.innerHTML='';
    for(const code of sortWorldLoopCodes([...selected])){
      const country=COUNTRY_MAP.get(code),chip=document.createElement('button');
      chip.type='button';chip.className='world-loop-selected-chip';chip.title='Remove '+country.name;chip.setAttribute('aria-label','Remove '+country.name);chip.innerHTML='<span>'+country.flag+'</span><strong>'+country.name+'</strong><i>×</i>';
      chip.addEventListener('click',()=>{selected.delete(code);renderPicker();addCountryButton.focus();});selectedHost.appendChild(chip);
    }
    pickCount.textContent=selected.size+' / 12 selected';addCountryButton.disabled=selected.size>=12;startButton.disabled=selected.size<4;renderCountryOptions();
  }
  function toggleCountryMenu(){
    const opening=countryMenu.hidden;
    countryMenu.hidden=!opening;addCountryButton.setAttribute('aria-expanded',String(opening));
    if(opening){renderCountryOptions();requestAnimationFrame(()=>countrySearch.focus());}
  }
  function racerSize(){return Math.round(clamp(72-selected.size*3.4,29,48));}
  function buildLanes(){
    lanesHost.innerHTML='';app.style.setProperty('--wl-lanes',String(racers.length));app.style.setProperty('--wl-racer-size',racerSize()+'px');
    const middleLaneIndex=Math.floor(racers.length/2);
    racers.forEach((racer,index)=>{
      const lane=document.createElement('div');
      const watermark=index===middleLaneIndex?'<div class="world-loop-lane-watermark">snapoki.com</div>':'';
      lane.className='world-loop-lane';lane.dataset.code=racer.code;
      const mascotClass='world-loop-mascot'+(WORLD_LOOP_FACE_RIGHT_MASCOTS.has(racer.mascot)?' world-loop-mascot--face-right':'');
      lane.innerHTML=watermark+'<div class="world-loop-lane-label"><span>'+racer.flag+'</span><b>'+racer.code+'</b><small>0 m</small></div><div class="world-loop-racer"><span class="'+mascotClass+'">'+racer.mascot+'</span><span class="world-loop-racer-flag">'+racer.flag+'</span></div>';
      lanesHost.appendChild(lane);racer.node=lane.querySelector('.world-loop-racer');racer.distanceLabel=lane.querySelector('.world-loop-lane-label small');
    });
  }
  function updateLeader(){
    const ordered=worldLoopOrder(racers),next=ordered[0];
    if(next&&leaderCode&&next.code!==leaderCode)leadChanges++;
    if(next)leaderCode=next.code;
    return ordered;
  }
  function updatePositions(ordered){
    if(!ordered.length)return;
    const leaderDistance=ordered[0].distance,minDistance=ordered[ordered.length-1].distance,packSpan=Math.max(0,leaderDistance-minDistance),viewSpan=Math.max(85,packSpan+34);
    const targetCamera=Math.max(0,leaderDistance-viewSpan*.73);
    cameraDistance+=(targetCamera-cameraDistance)*.07;
    const scroll=-((cameraDistance*5.2)%96);
    lanesHost.style.backgroundPositionX=scroll.toFixed(2)+'px';
    for(const racer of racers){
      const x=13+clamp((racer.distance-cameraDistance)/viewSpan,0,.98)*75;
      if(racer.node)racer.node.style.left=x.toFixed(3)+'%';
      if(racer.distanceLabel)racer.distanceLabel.textContent=formatWorldLoopDistance(racer.distance);
    }
  }
  function renderOrder(ordered){
    orderHost.innerHTML='';
    ordered.slice(0,3).forEach((racer,index)=>{
      const li=document.createElement('li');li.className=index===0?'leader':'';li.innerHTML='<b>'+(index+1)+'</b><span>'+racer.flag+'</span><strong>'+racer.code+'</strong><small>'+formatWorldLoopDistance(racer.distance)+'</small>';orderHost.appendChild(li);
    });
    if(ordered.length>3){
      const more=document.createElement('li');more.className='more';more.innerHTML='<b>…</b><strong>+'+(ordered.length-3)+'</strong><small>more</small>';orderHost.appendChild(more);
    }
  }
  function renderHud(force=false){
    if(!force&&elapsedMs-lastHudAt<180)return;lastHudAt=elapsedMs;
    const ordered=worldLoopOrder(racers),leader=ordered[0],gap=worldLoopGap(racers);
    renderOrder(ordered);
    if(leader){
      leaderHost.textContent=leader.flag+' '+leader.name;leaderMeta.textContent=formatWorldLoopDistance(leader.distance)+' travelled';leaderLabel.textContent=leader.flag+' '+leader.code+' LEADS';raceMeta.textContent=leader.code+' leads · '+racers.length+' racers · '+formatWorldLoopDistance(leader.distance);
    }
    gapHost.textContent=formatWorldLoopDistance(gap);changesHost.textContent=leadChanges+' lead change'+(leadChanges===1?'':'s');sessionHost.textContent=formatElapsed(elapsedMs);
    onMetrics({distance:leader?formatWorldLoopDistance(leader.distance):'0 m',leader:leader?.code||'—',gap:formatWorldLoopDistance(gap),racers:racers.length});
  }
  function stepRace(dt){
    const ordered=worldLoopOrder(racers),leaderDistance=ordered[0]?.distance||0,now=elapsedMs/1000;
    for(const racer of racers){
      const gap=Math.max(0,leaderDistance-racer.distance),catchup=Math.min(cfg.maxCatchup,gap*cfg.catchup),wave=Math.sin(now*(1.05+racer.acceleration*.22)+racer.phase)*cfg.variance;
      if(now>=racer.surgeUntil&&sessionRng()<dt*cfg.burstChance){racer.surgeUntil=now+.55+sessionRng()*.95;racer.surgePower=cfg.burst*racer.burstSkill*(.72+sessionRng()*.55);}
      const surge=now<racer.surgeUntil?racer.surgePower:0,pace=Math.max(cfg.base*.68,racer.baseSpeed+wave+catchup+surge);
      racer.distance+=pace*dt;
    }
    const nextOrder=updateLeader();updatePositions(nextOrder);
  }
  function syncAudioUi(){
    soundToggleButton.textContent=audioLoading?'… Loading':audioPausedByRace?'▶ Sound on Resume':audioUserPlaying?'⏸ Sound':'♪ Play Sound';
    soundMuteButton.textContent=audioMuted?'🔇':'🔊';
    soundMuteButton.setAttribute('aria-pressed',String(audioMuted));
    soundMuteButton.title=audioMuted?'Unmute sound':'Mute sound';
    volumeValue.textContent=Math.round(audioVolume*100)+'%';
  }
  function setMasterAudioLevel(rampSeconds=.06){
    if(!audioContext||!audioMasterGain)return;
    const now=audioContext.currentTime,target=audioMuted?0:audioVolume,current=audioMasterGain.gain.value;
    audioMasterGain.gain.cancelScheduledValues(now);
    audioMasterGain.gain.setValueAtTime(current,now);
    audioMasterGain.gain.linearRampToValueAtTime(target,now+rampSeconds);
  }
  function audioCrossfadeSeconds(){
    if(!audioBuffer)return WORLD_LOOP_CROSSFADE_SECONDS;
    return Math.min(WORLD_LOOP_CROSSFADE_SECONDS,Math.max(1,audioBuffer.duration*.25));
  }
  function scheduleAudioSource(startTime,index){
    if(!audioContext||!audioBuffer||!audioMasterGain)return 0;
    const duration=audioBuffer.duration,crossfade=audioCrossfadeSeconds(),stride=Math.max(.25,duration-crossfade);
    const source=audioContext.createBufferSource(),gain=audioContext.createGain(),fadeIn=index===0?Math.min(.8,crossfade*.2):crossfade;
    source.buffer=audioBuffer;source.connect(gain);gain.connect(audioMasterGain);
    gain.gain.setValueAtTime(0,startTime);
    gain.gain.linearRampToValueAtTime(1,startTime+fadeIn);
    gain.gain.setValueAtTime(1,startTime+duration-crossfade);
    gain.gain.linearRampToValueAtTime(0,startTime+duration);
    source.start(startTime);source.stop(startTime+duration+.05);
    audioSources.add(source);
    source.onended=()=>{audioSources.delete(source);try{source.disconnect();gain.disconnect();}catch{}};
    return stride;
  }
  function ensureAudioSchedule(){
    if(!audioUserPlaying||!audioContext||audioContext.state!=='running'||!audioBuffer)return;
    const horizon=audioContext.currentTime+WORLD_LOOP_AUDIO_SCHEDULE_AHEAD;
    while(audioNextStartTime<horizon){
      const stride=scheduleAudioSource(audioNextStartTime,audioScheduleIndex);
      if(!stride)break;
      audioNextStartTime+=stride;audioScheduleIndex++;
    }
  }
  async function ensureAudioReady(){
    if(audioContext&&audioBuffer&&audioMasterGain)return true;
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){onStatus('Background audio is not supported in this browser.');return false;}
    audioLoading=true;syncAudioUi();
    try{
      audioContext=new AudioCtx();await audioContext.resume();
      audioMasterGain=audioContext.createGain();audioMasterGain.gain.value=0;audioMasterGain.connect(audioContext.destination);
      const response=await fetch(WORLD_LOOP_AUDIO_SRC,{cache:'force-cache'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      audioBuffer=await audioContext.decodeAudioData(await response.arrayBuffer());
      if(!audioBuffer||!Number.isFinite(audioBuffer.duration)||audioBuffer.duration<=1)throw new Error('Invalid audio');
      audioNextStartTime=audioContext.currentTime+.06;audioScheduleIndex=0;setMasterAudioLevel(.22);
      return true;
    }catch{
      const ctx=audioContext;audioContext=null;audioBuffer=null;audioMasterGain=null;
      if(ctx){try{await ctx.close();}catch{}}
      onStatus('Background music is unavailable. Upload public/audio/world-loop/endless-circuit.mp3 and try again.');
      return false;
    }finally{audioLoading=false;syncAudioUi();}
  }
  async function playBackgroundMusic(){
    if(!started||!running||audioLoading)return;
    if(!await ensureAudioReady())return;
    if(!running)return;
    try{await audioContext.resume();audioUserPlaying=true;audioPausedByRace=false;ensureAudioSchedule();setMasterAudioLevel(.16);syncAudioUi();onStatus('Background music playing with a 10-second crossfade loop.');}
    catch{audioUserPlaying=false;syncAudioUi();onStatus('Background music could not start.');}
  }
  async function pauseBackgroundMusic(){
    if(!audioContext||!audioUserPlaying)return;
    audioUserPlaying=false;audioPausedByRace=false;try{await audioContext.suspend();}catch{}syncAudioUi();onStatus('Background music paused.');
  }
  async function pauseBackgroundMusicForRace(){
    if(!audioContext||!audioUserPlaying||audioContext.state!=='running')return;
    audioPausedByRace=true;try{await audioContext.suspend();}catch{audioPausedByRace=false;}syncAudioUi();
  }
  async function resumeBackgroundMusicAfterRace(){
    if(!audioContext||!audioUserPlaying||!audioPausedByRace)return;
    try{await audioContext.resume();audioPausedByRace=false;ensureAudioSchedule();setMasterAudioLevel(.08);}catch{}syncAudioUi();
  }
  async function toggleBackgroundMusic(){if(audioUserPlaying)await pauseBackgroundMusic();else await playBackgroundMusic();}
  function toggleBackgroundMute(){audioMuted=!audioMuted;setMasterAudioLevel(.08);syncAudioUi();}
  function setBackgroundVolume(){
    audioVolume=clamp(Number(volumeSlider.value)/100,0,1);setMasterAudioLevel(.06);syncAudioUi();
  }
  async function resetBackgroundMusic(){
    audioUserPlaying=false;audioPausedByRace=false;audioLoading=false;
    for(const source of audioSources){try{source.onended=null;source.stop();source.disconnect();}catch{}}
    audioSources.clear();
    const ctx=audioContext;audioContext=null;audioBuffer=null;audioMasterGain=null;audioNextStartTime=0;audioScheduleIndex=0;
    if(ctx){try{await ctx.close();}catch{}}
    syncAudioUi();
  }
  // Run the animation only while the race is visible and active. This avoids
  // scheduling frames during setup, Pause, Stop or when the tab is hidden.
  function scheduleFrame(){
    if(!raf&&running&&document.visibilityState!=='hidden')raf=requestAnimationFrame(frame);
  }
  function haltFrame(){
    if(raf)cancelAnimationFrame(raf);
    raf=0;lastFrame=0;
  }
  function frame(now){
    raf=0;
    if(!running||document.visibilityState==='hidden')return;
    ensureAudioSchedule();
    if(!lastFrame)lastFrame=now;
    const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));
    lastFrame=now;elapsedMs+=dt*1000;stepRace(dt);renderHud();
    scheduleFrame();
  }
  async function releaseWakeLock(){const lock=wakeLock;wakeLock=null;if(lock){try{await lock.release();}catch{}}wakeHost.textContent='SCREEN MODE';}
  async function requestWakeLock(){
    if(!started||!running||document.visibilityState==='hidden'||!navigator.wakeLock?.request){wakeHost.textContent='SCREEN MODE';return;}if(wakeLock){wakeHost.textContent='SCREEN AWAKE';return;}
    try{
      const acquired=await navigator.wakeLock.request('screen');
      // The user may have stopped the race while the asynchronous request was pending.
      if(!started||!running||document.visibilityState==='hidden'){
        await acquired.release();
        wakeHost.textContent='SCREEN MODE';
        return;
      }
      wakeLock=acquired;
      wakeHost.textContent='SCREEN AWAKE';
      acquired.addEventListener('release',()=>{if(wakeLock===acquired){wakeLock=null;wakeHost.textContent='SCREEN MODE';}},{once:true});
    }catch{wakeHost.textContent='SCREEN MODE';}
  }
  function beginSession(nextSeed){
    closeCountryMenu();saveSelection();sessionRng=rngFromSeed(String(nextSeed)+':endless:v4');racers=buildWorldLoopRoster(sortWorldLoopCodes([...selected]),nextSeed,difficulty).map(racer=>({...racer,distance:0,surgeUntil:0,surgePower:0,node:null,distanceLabel:null}));elapsedMs=0;lastHudAt=-Infinity;cameraDistance=0;leaderCode='';leadChanges=0;running=true;started=true;pauseButton.disabled=false;restartButton.disabled=false;changeButton.disabled=false;fullscreenButton.disabled=false;soundToggleButton.disabled=false;soundMuteButton.disabled=false;volumeSlider.disabled=false;pauseButton.textContent='Pause';setup.hidden=true;buildLanes();const ordered=updateLeader();updatePositions(ordered);renderHud(true);lastFrame=performance.now();scheduleFrame();requestWakeLock();resumeBackgroundMusicAfterRace();onStatus('Endless race started. There is no finish line and no automatic reset.');
  }
  function restartSession(){if(selected.size<4)return;restartCounter++;beginSession(String(seed)+':manual:'+restartCounter+':'+Date.now());}
  function stopSession(){closeCountryMenu();running=false;started=false;haltFrame();releaseWakeLock();resetBackgroundMusic();setup.hidden=false;pauseButton.disabled=true;restartButton.disabled=true;changeButton.disabled=true;fullscreenButton.disabled=true;soundToggleButton.disabled=true;soundMuteButton.disabled=true;volumeSlider.disabled=true;pauseButton.textContent='Pause';leaderCode='';leadChanges=0;cameraDistance=0;renderPicker();onMetrics({distance:'0 m',leader:'—',gap:'0 m',racers:selected.size});onStatus('Race stopped. Pick countries, then Start Endless Race to begin again from zero.');}
  async function togglePause(){if(!started)return;running=!running;pauseButton.textContent=running?'Pause':'Resume';if(running){lastFrame=performance.now();scheduleFrame();requestWakeLock();await resumeBackgroundMusicAfterRace();onStatus('Race resumed.');}else{haltFrame();releaseWakeLock();await pauseBackgroundMusicForRace();onStatus('Race paused. Resume whenever you are ready.');}}
  function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement||null;}
  function syncFullscreen(){const active=fullscreenElement()===app;app.classList.toggle('is-fullscreen',active);fullscreenButton.textContent=active?'⛶ Exit Full Screen':'⛶ Full Screen';fullscreenButton.setAttribute('aria-pressed',String(active));if(active)requestWakeLock();}
  async function toggleFullscreen(){
    if(!started||fullscreenButton.disabled)return;
    try{if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document);return;}const request=app.requestFullscreen||app.webkitRequestFullscreen;if(!request){onStatus('Full screen is not available in this browser.');return;}try{await request.call(app,{navigationUI:'hide'});}catch{await request.call(app);}requestWakeLock();}catch{onStatus('Full screen could not be opened.');}
  }

  addCountryButton.addEventListener('click',toggleCountryMenu);countrySearch.addEventListener('input',renderCountryOptions);countrySearch.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeCountryMenu();addCountryButton.focus();}});
  pickerDocumentListener=event=>{if(!pickerWrap.contains(event.target))closeCountryMenu();};document.addEventListener('pointerdown',pickerDocumentListener);
  startButton.addEventListener('click',()=>{restartCounter++;beginSession(String(seed)+':start:'+restartCounter+':'+Date.now());});pauseButton.addEventListener('click',togglePause);restartButton.addEventListener('click',restartSession);changeButton.addEventListener('click',stopSession);soundToggleButton.addEventListener('click',toggleBackgroundMusic);soundMuteButton.addEventListener('click',toggleBackgroundMute);volumeSlider.addEventListener('input',setBackgroundVolume);fullscreenButton.addEventListener('click',toggleFullscreen);
  randomButton.addEventListener('click',()=>{selected=new Set(shuffle(WORLD_LOOP_COUNTRIES,Math.random).slice(0,8).map(country=>country.code));renderPicker();});clearButton.addEventListener('click',()=>{selected=new Set();renderPicker();});
  fullscreenListener=syncFullscreen;document.addEventListener('fullscreenchange',fullscreenListener);document.addEventListener('webkitfullscreenchange',fullscreenListener);visibilityListener=()=>{
    if(document.visibilityState==='hidden'){
      haltFrame();
      releaseWakeLock();
      void pauseBackgroundMusicForRace();
    }else if(started&&running){
      lastFrame=performance.now();
      scheduleFrame();
      requestWakeLock();
      void resumeBackgroundMusicAfterRace();
    }
  };document.addEventListener('visibilitychange',visibilityListener);

  loadSelection();renderPicker();onMetrics({distance:'0 m',leader:'—',gap:'0 m',racers:selected.size});onStatus('');
  return{supportsUndo:false,reset(){if(started)restartSession();},stop(){stopSession();},setDifficulty(nextDifficulty){cfg=LEVEL[nextDifficulty]||LEVEL.medium;},hint(){return false;},solution(){},hideSolution(){},previewScore(){return 0;},getResult(){const ordered=worldLoopOrder(racers);return{score:0,metadata:{elapsedMs,leadChanges,leader:ordered[0]?.code||'',racers:racers.map(racer=>({code:racer.code,distance:racer.distance}))}};},destroy(){haltFrame();running=false;releaseWakeLock();resetBackgroundMusic();if(fullscreenListener){document.removeEventListener('fullscreenchange',fullscreenListener);document.removeEventListener('webkitfullscreenchange',fullscreenListener);}if(visibilityListener)document.removeEventListener('visibilitychange',visibilityListener);if(pickerDocumentListener)document.removeEventListener('pointerdown',pickerDocumentListener);}};
}
