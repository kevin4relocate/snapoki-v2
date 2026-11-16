import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');

test('Cruise, Dynamic and Sprint remain grouped with Pause, Restart and Stop',()=>{
  const runtime=read('src/js/games/world-loop.js');
  const markup=runtime.slice(runtime.indexOf("host.innerHTML='<div class=\"world-loop-app\">'"),runtime.indexOf("const app=host.querySelector"));
  assert.match(markup,/class="world-loop-race-actions"><div class="world-loop-session-controls"><div id="worldLoopPace"/);
  for(const item of ['worldLoopPace','worldLoopPause','worldLoopRestart','worldLoopChange'])
    assert.ok(markup.includes('id="'+item+'"'),item);
  const controls=markup.slice(markup.indexOf('class="world-loop-session-controls"'),markup.indexOf('class="world-loop-audio-controls"'));
  for(const item of ['worldLoopPace','worldLoopPause','worldLoopRestart','worldLoopChange'])
    assert.ok(controls.includes('id="'+item+'"'),item+' must share the same group');
  assert.match(markup,/class="world-loop-audio-controls"/);
});

test('CURRENT ORDER keeps the same nodes and fixed-width slots between HUD updates',()=>{
  const runtime=read('src/js/games/world-loop.js');
  const stylesheet=read('src/styles/world-loop.css');
  const block=runtime.slice(runtime.indexOf('function renderOrder(ordered)'),runtime.indexOf('function renderHud('));
  assert.match(block,/orderHost\.children\.length!==visible\+\(hasMore\?1:0\)/);
  assert.match(block,/orderHost\.replaceChildren\(\)/);
  assert.match(block,/if\(flag\.textContent!==racer\.flag\)flag\.textContent=racer\.flag/);
  assert.match(block,/if\(metres\.textContent!==distance\)metres\.textContent=distance/);
  assert.doesNotMatch(block,/orderHost\.innerHTML=''/);
  assert.match(stylesheet,/\.world-loop-orderbar li\{[\s\S]*?flex:0 0 166px;/);
  assert.match(stylesheet,/\.world-loop-orderbar li\.more\{[\s\S]*?flex:0 0 98px;/);
  assert.match(stylesheet,/font-variant-numeric:tabular-nums/);
});

test('Play Sound label and width remain stable through audio state changes',()=>{
  const runtime=read('src/js/games/world-loop.js');
  const stylesheet=read('src/styles/world-loop.css');
  const block=runtime.slice(runtime.indexOf('function syncAudioUi()'),runtime.indexOf('function setMasterAudioLevel('));
  assert.match(block,/soundToggleButton\.textContent='♪ Play Sound'/);
  assert.match(block,/soundToggleButton\.setAttribute\('aria-pressed',String\(audioUserPlaying\)\)/);
  assert.match(block,/soundToggleButton\.setAttribute\('aria-label',/);
  assert.match(stylesheet,/\.world-loop-audio-controls \.world-loop-sound-toggle\{[\s\S]*?flex:0 0 110px;/);
  assert.match(stylesheet,/\.world-loop-session-controls > button\{[\s\S]*?flex:0 0 72px;/);
});
