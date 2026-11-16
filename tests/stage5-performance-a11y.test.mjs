import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');

test('World Loop animation is scheduled only for a visible active race',()=>{
  const source=(read('src/js/games/world-loop.js')+'\n'+read('src/js/endless-race/engine.js')+'\n'+read('src/js/endless-race/themes/flag.js'));
  assert.match(source,/function scheduleFrame\(\)\{/);
  assert.match(source,/if\(!raf&&running&&document\.visibilityState!=='hidden'\)raf=requestAnimationFrame\(frame\)/);
  assert.match(source,/function haltFrame\(\)\{/);
  assert.match(source,/if\(raf\)cancelAnimationFrame\(raf\)/);
  assert.match(source,/function frame\(now\)\{\s*raf=0;\s*if\(!running\|\|document\.visibilityState==='hidden'\)return/);
  assert.match(source,/function stopSession\(\)\{[^}]*haltFrame\(\)/);
  assert.match(source,/destroy\(\)\{haltFrame\(\)/);
  assert.doesNotMatch(source,/onStatus\(''\);raf=requestAnimationFrame\(frame\)/);
});

test('World Loop suspends hidden-tab music and avoids an elapsed-time jump',()=>{
  const source=(read('src/js/games/world-loop.js')+'\n'+read('src/js/endless-race/engine.js')+'\n'+read('src/js/endless-race/themes/flag.js'));
  assert.match(source,/document\.visibilityState==='hidden'\)\{\s*haltFrame\(\);\s*releaseWakeLock\(\);\s*void pauseBackgroundMusicForRace\(\)/);
  assert.match(source,/lastFrame=performance\.now\(\);\s*scheduleFrame\(\);\s*requestWakeLock\(\);\s*void resumeBackgroundMusicAfterRace\(\)/);
  assert.match(source,/const WORLD_LOOP_AUDIO_SCHEDULE_AHEAD=25/);
  assert.match(source,/audioContext\.currentTime\+WORLD_LOOP_AUDIO_SCHEDULE_AHEAD/);
});

test('World Loop picker maintains selection state and keyboard focus',()=>{
  const source=(read('src/js/games/world-loop.js')+'\n'+read('src/js/endless-race/engine.js')+'\n'+read('src/js/endless-race/themes/flag.js'));
  assert.match(source,/aria-controls="worldLoopCountryMenu"/);
  assert.match(source,/button\.setAttribute\('aria-pressed',String\(isSelected\)\)/);
  assert.match(source,/chip\.setAttribute\('aria-label','Remove '\+country\.name\)/);
  assert.match(source,/const replacement=\[\.\.\.countryOptions\.querySelectorAll\('button'\)\]/);
  assert.ok(source.includes("pickerWrap.addEventListener('keydown',event=>{if(event.key==='Escape'&&!countryMenu.hidden)"));
  assert.ok(source.includes('if(opening){renderCountryOptions();positionCountryMenu();countrySearch.focus();}'));
});

test('hidden puzzle pages stop intervals and resync the UTC date on return',()=>{
  const source=read('src/js/game-page.js');
  assert.match(source,/function syncVisibleTimers\(\)/);
  assert.match(source,/document\.visibilityState==='hidden'/);
  assert.match(source,/clearInterval\(dailyCountdownInterval\)/);
  assert.match(source,/document\.addEventListener\('visibilitychange',syncVisibleTimers\)/);
  assert.match(source,/updateCountdown\(\);\s*if\(!dailyCountdownInterval\)/);
});

test('mobile touch controls and focus outlines support keyboard and reduced-motion settings',()=>{
  const css=read('src/styles/ui-safety.css');
  const worldCss=read('src/styles/world-loop.css');
  const runtime=read('src/js/game-page.js');
  assert.match(css,/:focus-visible\s*\{/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(worldCss,/\.world-loop-racebar\{flex-wrap:wrap\}/);
  assert.match(worldCss,/\.world-loop-country-option[^}]*min-height:44px/);
  assert.match(runtime,/matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
});

test('browser smoke explicitly checks mobile overflow and pauses the live game',()=>{
  const suite=read('scripts/browser-smoke.mjs');
  assert.match(suite,/for\(const width of \[390,320\]\)/);
  assert.match(suite,/metrics\.scroll>metrics\.width\+2/);
  assert.match(suite,/verifyWorldLoopAnimation\(page\)/);
  assert.match(suite,/__wlRafCalls/);
  assert.match(suite,/worldLoopPause/);
});
