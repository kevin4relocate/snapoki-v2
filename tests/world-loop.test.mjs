import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WORLD_LOOP_AUDIO_SRC,WORLD_LOOP_COUNTRIES,WORLD_LOOP_CROSSFADE_SECONDS,WORLD_LOOP_MASCOTS,WORLD_LOOP_PICKER_COUNTRIES,buildWorldLoopRoster,formatWorldLoopDistance,sortWorldLoopCodes,worldLoopGap,worldLoopOrder} from '../src/js/games/world-loop.js';

test('World Loop ships 196 country choices including Taiwan plus a mascot pool',()=>{assert.equal(WORLD_LOOP_COUNTRIES.length,196);assert.ok(WORLD_LOOP_MASCOTS.length>=8);assert.equal(new Set(WORLD_LOOP_COUNTRIES.map(country=>country.code)).size,196);assert.deepEqual(WORLD_LOOP_COUNTRIES.find(country=>country.code==='TW'),{code:'TW',name:'Taiwan',flag:'🇹🇼'});});
test('World Loop racer traits are deterministic and country-neutral',()=>{const a=buildWorldLoopRoster(['VN','JP','US','BR'],'world-loop:medium:test','medium'),b=buildWorldLoopRoster(['JP','VN','BR','US'],'world-loop:medium:test','medium'),traits=list=>list.map(racer=>({baseSpeed:racer.baseSpeed,acceleration:racer.acceleration,burstSkill:racer.burstSkill,phase:racer.phase,mascot:racer.mascot}));assert.deepEqual(traits(a),traits(b),'the same seed assigns the same trait sequence regardless of flag identity');assert.deepEqual(traits(a),traits(buildWorldLoopRoster(['VN','JP','US','BR'],'world-loop:medium:test','medium')));});
test('World Loop order and gap use unbounded distance',()=>{const racers=[{code:'A',index:0,distance:1204.2},{code:'B',index:1,distance:1299.8},{code:'C',index:2,distance:1250.5}];assert.deepEqual(worldLoopOrder(racers).map(r=>r.code),['B','C','A']);assert.ok(Math.abs(worldLoopGap(racers)-49.3)<1e-9);assert.equal(formatWorldLoopDistance(1299.8),'1.3 km');});
test('World Loop has no finish line, winner, round or automatic position reset',()=>{const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');assert.match(source,/There is no finish line and no automatic reset/);assert.doesNotMatch(source,/finishRound|prepareRound|winner\.wins|world-loop-finish|ROUND WINNER|next round/i);assert.doesNotMatch(styles,/world-loop-finish|conic-gradient/);assert.match(source,/racer\.distance\+=pace\*dt/);});
test('World Loop camera and road scroll forward forever while racers stay readable',()=>{const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');assert.match(source,/cameraDistance/);assert.match(source,/backgroundPositionX/);assert.match(source,/viewSpan/);assert.match(styles,/repeating-linear-gradient/);assert.match(styles,/will-change:background-position/);});
test('World Loop exposes fullscreen screensaver mode and wake lock',()=>{const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');assert.match(source,/worldLoopFullscreen/);assert.match(source,/requestFullscreen|webkitRequestFullscreen/);assert.match(source,/navigator\.wakeLock/);assert.match(source,/visibilitychange/);assert.match(styles,/\.world-loop-app:fullscreen/);assert.match(styles,/height:100vh/);});
test('World Loop endless runtime stays bounded and uses one animation loop',()=>{const source=fs.readFileSync('src/js/games/world-loop.js','utf8');assert.doesNotMatch(source,/winnerHistory|roundHistory|raceHistory/);assert.doesNotMatch(source,/setInterval\(|setTimeout\(/);assert.match(source,/requestAnimationFrame/);assert.match(source,/leadChanges\+\+/);});
test('World Loop only returns to zero after an explicit started-session restart or Stop',()=>{const source=fs.readFileSync('src/js/games/world-loop.js','utf8');assert.match(source,/function restartSession/);assert.match(source,/distance:0/);assert.match(source,/reset\(\)\{if\(started\)restartSession\(\);\}/);assert.match(source,/■ Stop/);});


test('World Loop country picker and lane order are alphabetical with Vietnam pinned last',()=>{
  const pickerNames=WORLD_LOOP_PICKER_COUNTRIES.map(country=>country.name);
  assert.equal(pickerNames.at(-1),'Vietnam');
  assert.deepEqual(pickerNames.slice(0,-1),[...pickerNames.slice(0,-1)].sort((a,b)=>a.localeCompare(b,'en')));
  const codes=sortWorldLoopCodes(['VN','US','TW','AR','JP','BR','DE']);
  assert.deepEqual(codes,['AR','BR','DE','JP','TW','US','VN']);
});

test('World Loop uses a searchable compact country picker instead of rendering all countries in the card',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(source,/worldLoopAddCountry/);
  assert.match(source,/Search 196 countries/);
  assert.match(source,/worldLoopCountrySearch/);
  assert.match(source,/WORLD_LOOP_PICKER_COUNTRIES\.filter/);
  assert.match(styles,/\.world-loop-country-menu/);
  assert.match(styles,/\.world-loop-country-options\{[^}]*max-height:118px;[^}]*overflow-y:auto/);
  assert.doesNotMatch(source,/worldLoopFlagGrid/);
});


test('World Loop uses one fixed horizontal Snapoki watermark on the middle lane only',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(source,/middleLaneIndex=Math\.floor\(racers\.length\/2\)/);
  assert.match(source,/world-loop-lane-watermark/);
  assert.match(source,/snapoki\.com/);
  assert.match(styles,/\.world-loop-lane-watermark/);
  assert.doesNotMatch(styles,/data:image\/svg\+xml/);
  assert.match(styles,/background-size:96px 100%/);
});


test('World Loop removes the full-height outer board panel frame',()=>{
  const styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/body\[data-game="world-loop"\] \.board-panel\{[^}]*border:0;[^}]*background:transparent;[^}]*box-shadow:none;[^}]*border-radius:0/);
});


test('World Loop exposes an explicit Stop action that returns to flag selection',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  assert.match(source,/■ Stop/);
  assert.match(source,/function stopSession\(\)/);
  assert.match(source,/setup\.hidden=false/);
  assert.match(source,/started=false/);
  assert.match(source,/changeButton\.disabled=true/);
  assert.match(source,/Race stopped\. Pick countries/);
});

test('World Loop uses a compact no-scroll setup card',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/height:clamp\(350px,40vw,500px\)/);
  assert.match(styles,/\.world-loop-setup-card\{[^}]*overflow:visible;[^}]*padding:12px/);
  assert.match(styles,/\.world-loop-selected\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(source,/Build the field/i);
  assert.doesNotMatch(source,/There is no finish line and no automatic reset\. Every racer keeps moving forward forever until you manually Restart, Reset or change the field\./);
});


test('World Loop current order shows Top 5 plus one compact remainder item',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(source,/const visible=Math\.min\(5,ordered\.length\)/);
  assert.match(source,/ordered\.length>5/);
  assert.match(source,/more\.className='more'/);
  assert.match(source,/ordered\.length-5/);
  assert.match(styles,/\.world-loop-orderbar li\.more/);
});


test('World Loop hides the shared Live Race toolbar to save vertical space',()=>{
  const styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/body\[data-game="world-loop"\] \.board-toolbar\{display:none!important\}/);
});


test('World Loop generated HTML omits the shared board toolbar entirely',()=>{
  const html=fs.readFileSync('dist/world-loop/index.html','utf8');
  assert.doesNotMatch(html,/class="board-toolbar"/);
  assert.doesNotMatch(html,/>Live Race<\/button>/);
});

test('Puzzle pages keep the shared board toolbar',()=>{
  const html=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(html,/class="board-toolbar"/);
});


test('World Loop selected countries stay compact while the 196-country list lives in the popup',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(source,/world-loop-selected-chip/);
  assert.match(source,/selected\.size<12/);
  assert.match(source,/selected\.size>=12/);
  assert.match(source,/countryMenu\.hidden/);
  assert.match(styles,/\.world-loop-selected\{[^}]*display:grid/);
  assert.match(styles,/\.world-loop-country-menu\{[^}]*position:absolute/);
});


test('World Loop selected countries wrap into two or three rows instead of overflowing horizontally',()=>{
  const styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/\.world-loop-selected\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(styles,/@media\(max-width:900px\)\{[\s\S]*?\.world-loop-selected\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(styles,/\.world-loop-selected\{[^}]*overflow-x:auto/);
});

test('World Loop country search floats upward without expanding the setup card',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/\.world-loop-country-menu\{[^}]*position:absolute;[^}]*bottom:calc\(100% \+ 6px\);[^}]*max-height:172px/);
  assert.match(styles,/\.world-loop-country-options\{[^}]*max-height:118px;[^}]*overflow-y:auto/);
  assert.doesNotMatch(styles,/\.world-loop-country-menu\{[^}]*position:relative/);
  assert.match(source,/loadSelection\(\);renderPicker\(\);syncPace\(\);syncAudioUi\(\)/);
  assert.doesNotMatch(source,/Pick 4–12 flags, then start the endless 24\/7 race\./);
});


test('World Loop Full Screen stays disabled until a race has started',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  assert.match(source,/worldLoopFullscreen[^>]*disabled>⛶ Full Screen/);
  assert.match(source,/fullscreenButton\.disabled=false/);
  assert.match(source,/fullscreenButton\.disabled=true/);
  assert.match(source,/if\(!started\|\|fullscreenButton\.disabled\)return/);
});


test('World Loop lanes use subtle alternating dark blue-gray tones',()=>{
  const styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/\.world-loop-lanes\{[^}]*background-color:#303742/);
  assert.match(styles,/\.world-loop-lane:nth-child\(odd\)\{background:rgba\(255,255,255,\.014\)\}/);
  assert.match(styles,/\.world-loop-lane:nth-child\(even\)\{background:rgba\(8,14,24,\.055\)\}/);
  assert.match(styles,/border-bottom:1px solid rgba\(214,224,242,\.14\)/);
  assert.match(styles,/border-top:1px dashed rgba\(220,230,246,\.07\)/);
});


test('World Loop background music is opt-in and points at the future public MP3 asset',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  assert.equal(WORLD_LOOP_AUDIO_SRC,'/audio/world-loop/endless-circuit.mp3');
  assert.equal(WORLD_LOOP_CROSSFADE_SECONDS,10);
  assert.match(source,/worldLoopSoundToggle[^>]*disabled>♪ Play Sound/);
  assert.match(source,/soundToggleButton\.addEventListener\('click',toggleBackgroundMusic\)/);
  assert.doesNotMatch(source,/beginSession\([^)]*\)[\s\S]{0,900}playBackgroundMusic\(\)/);
});

test('World Loop schedules a true 10-second Web Audio crossfade instead of hard-looping the MP3',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  assert.match(source,/window\.AudioContext\|\|window\.webkitAudioContext/);
  assert.match(source,/createBufferSource\(\)/);
  assert.match(source,/duration-crossfade/);
  assert.match(source,/linearRampToValueAtTime\(1,startTime\+fadeIn\)/);
  assert.match(source,/linearRampToValueAtTime\(0,startTime\+duration\)/);
  assert.match(source,/WORLD_LOOP_AUDIO_SCHEDULE_AHEAD=25/);
  assert.doesNotMatch(source,/\.loop=true/);
});

test('World Loop music has independent play pause mute and volume controls',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(source,/worldLoopSoundMute/);
  assert.match(source,/worldLoopVolume/);
  assert.match(source,/audioContext\.suspend\(\)/);
  assert.match(source,/audioMuted=!audioMuted/);
  assert.match(source,/volumeSlider\.addEventListener\('input',setBackgroundVolume\)/);
  assert.match(styles,/\.world-loop-audio-controls/);
  assert.match(styles,/\.world-loop-volume input/);
});

test('World Loop race Pause temporarily pauses active music and Resume restores only that music',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  assert.match(source,/audioPausedByRace=false/);
  assert.match(source,/async function pauseBackgroundMusicForRace\(\)/);
  assert.match(source,/audioPausedByRace=true/);
  assert.match(source,/async function resumeBackgroundMusicAfterRace\(\)/);
  assert.match(source,/if\(!audioContext\|\|!audioUserPlaying\|\|!audioPausedByRace\)return/);
  const togglePause=source.match(/async function togglePause\(\)\{[\s\S]*?\n  \}/)?.[0]||'';
  assert.match(togglePause,/resumeBackgroundMusicAfterRace\(\)/);
  assert.match(togglePause,/pauseBackgroundMusicForRace\(\)/);
  assert.match(source,/function stopSession\(\)[^{]*\{[^}]*resetBackgroundMusic\(\)/);
  assert.match(source,/destroy\(\)\{[^}]*resetBackgroundMusic\(\)/);
});


test('World Loop never starts music with Start Race and manual Sound pause cancels race auto-resume intent',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  const begin=source.match(/function beginSession\(nextSeed\)\{[\s\S]*?\n  \}/)?.[0]||'';
  assert.doesNotMatch(begin,/playBackgroundMusic\(\)/);
  assert.match(source,/async function pauseBackgroundMusic\(\)[\s\S]*?audioUserPlaying=false;audioPausedByRace=false/);
  assert.match(source,/async function playBackgroundMusic\(\)[\s\S]*?if\(!started\|\|!running\|\|audioLoading\)return/);
});


test('World Loop orients every animal mascot toward the race direction',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(source,/WORLD_LOOP_FACE_RIGHT_MASCOTS=new Set\(\['🏎️','🐇','🦊','🐝','🐲','🦅','🐬','🦖'\]\)/);
  assert.match(source,/WORLD_LOOP_FACE_RIGHT_MASCOTS\.has\(racer\.mascot\)\?' world-loop-mascot--face-right'/);
  assert.match(styles,/\.world-loop-mascot--face-right\{transform:scaleX\(-1\);transform-origin:center\}/);
  assert.match(styles,/\.world-loop-mascot\{display:inline-block/);
  for(const animal of ['🐇','🦊','🐝','🐲','🦅','🐬','🦖'])assert.match(source,new RegExp(animal));
});


test('World Loop hero description is one concise sentence and setup picker sits at the top',()=>{
  const config=fs.readFileSync('src/js/games-config.js','utf8'),styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(config,/description:'Choose 4–12 countries from 196 choices and watch an endless horizontal race with no finish line, no rounds and no automatic reset\.'/);
  assert.doesNotMatch(config,/Distance keeps increasing forever while the camera follows the pack until you manually stop, restart or reset\./);
  assert.match(styles,/\.world-loop-setup\{[^}]*place-items:start center;[^}]*padding:52px 8px 8px/);
  assert.doesNotMatch(styles,/\.world-loop-setup\{[^}]*place-items:center/);
});


test('World Loop upward country dropdown stays compact across responsive layouts',()=>{
  const styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/@media\(max-width:900px\)[\s\S]*?\.world-loop-country-options\{max-height:112px\}/);
  assert.match(styles,/@media\(max-width:680px\)[\s\S]*?\.world-loop-country-options\{max-height:104px\}/);
  assert.match(styles,/@media\(max-width:460px\)[\s\S]*?\.world-loop-country-menu\{left:-2px;right:-2px;max-height:158px\}/);
  assert.match(styles,/@media\(max-width:460px\)[\s\S]*?\.world-loop-country-options\{max-height:96px\}/);
});


test('World Loop race meta stays on one line on desktop',()=>{
  const styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  assert.match(styles,/\.world-loop-title\{[^}]*flex-shrink:0/);
  assert.match(styles,/\.world-loop-title small\{[^}]*white-space:nowrap/);
  assert.match(styles,/@media\(max-width:680px\)[\s\S]*?\.world-loop-title small\{display:none\}/);
});


test('World Loop avoids misleading 24/7 wording while keeping endless and wake-lock features',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  const config=fs.readFileSync('src/js/games-config.js','utf8');
  const presentation=fs.readFileSync('src/js/game-presentation.js','utf8');
  const launch=fs.readFileSync('scripts/launch-readiness.mjs','utf8');
  assert.match(source,/ENDLESS RACE/);
  assert.match(source,/SCREEN MODE/);
  assert.match(source,/SCREEN AWAKE/);
  assert.doesNotMatch(source,/LIVE 24\/7|24\/7 MODE/);
  assert.match(config,/Full Screen \+ Wake Lock/);
  assert.doesNotMatch(config,/24\/7 Full Screen|World Loop – 24\/7/);
  assert.doesNotMatch(presentation,/24\/7 screensaver/);
  assert.doesNotMatch(launch,/World Loop is a 24\/7|<h2>24\/7 endless format<\/h2>/);
});


test('World Loop launch controls avoid duplicate shared restart/reset actions and change pace live',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  const styles=fs.readFileSync('src/styles/world-loop.css','utf8');
  const page=fs.readFileSync('src/js/game-page.js','utf8');
  const config=fs.readFileSync('src/js/games-config.js','utf8');
  assert.match(styles,/body\[data-game="world-loop"\] \.left-panel \.control-stack\{display:none!important\}/);
  assert.match(source,/setDifficulty\(nextDifficulty\)\{setPace\(nextDifficulty\);\}/);
  assert.match(source,/reset\(\)\{if\(started\)restartSession\(\);\}/);
  assert.match(page,/game\.key==='world-loop'&&state\.engine\?\.setDifficulty/);
  assert.match(config,/modeLabel:'Endless Race'/);
  assert.doesNotMatch(config,/modeLabel:'Live Race'/);
});

test('World Loop public copy consistently says countries and Stop instead of legacy flag/reset wording',()=>{
  const source=fs.readFileSync('src/js/games/world-loop.js','utf8');
  const config=fs.readFileSync('src/js/games-config.js','utf8');
  const presentation=fs.readFileSync('src/js/game-presentation.js','utf8');
  const launch=fs.readFileSync('scripts/launch-readiness.mjs','utf8');
  const readme=fs.readFileSync('README.md','utf8');
  assert.doesNotMatch(source,/Race stopped\. Pick flags/);
  assert.doesNotMatch(config,/flag selection|Restart, Reset or Stop/);
  assert.doesNotMatch(presentation,/flag selection|Restart or Reset/);
  assert.doesNotMatch(launch,/Change Flags|flag selection|Restart, Reset/);
  assert.doesNotMatch(readme,/Change Flags|Restart, Reset/);
});
