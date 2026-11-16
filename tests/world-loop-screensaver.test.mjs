import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('World Loop is built as a full-width ambient screensaver, without puzzle sidebars',()=>{
  const html=read('dist/world-loop/index.html');
  const css=read('src/styles/world-loop.css');
  assert.match(html,/class="game-layout world-loop-layout"/);
  assert.match(html,/class="panel board-panel world-loop-panel"/);
  assert.match(html,/Ambient screensaver/);
  for(const legacy of ['class="panel left-panel"','class="right-panel"','class="game-howto','class="difficulty-button"','class="section daily-section"']){
    assert.ok(!html.includes(legacy),`World Loop still contains puzzle-only UI ${legacy}`);
  }
  assert.match(css,/\.game-layout\.world-loop-layout\s*\{/);
  assert.match(css,/width:min\(calc\(100% - 32px\),1640px\)/);
  assert.match(css,/\.world-loop-viewport\{height:clamp\(540px,72vh,940px\)\}/);
  const puzzle=read('dist/maze/index.html');
  assert.match(puzzle,/class="panel left-panel"/);
  assert.match(puzzle,/class="right-panel"/);
});

test('World Loop has three immediately selectable pace controls inside the race toolbar',()=>{
  const source=read('src/js/games/world-loop.js');
  assert.match(source,/id="worldLoopPace"/);
  for(const pace of ['easy','medium','hard'])assert.ok(source.includes(`data-pace="${pace}"`));
  assert.match(source,/for\(const button of paceButtons\)button\.addEventListener\('click',\(\)=>setPace\(button\.dataset\.pace\)\)/);
  assert.match(source,/const ratio=LEVEL\[next\]\.base\/cfg\.base/);
  assert.match(source,/for\(const racer of racers\)racer\.baseSpeed\*=ratio/);
  assert.match(source,/button\.setAttribute\('aria-pressed',String\(active\)\)/);
  const setPace=source.slice(source.indexOf('function setPace('),source.indexOf('function loadSelection('));
  assert.doesNotMatch(setPace,/restartSession|beginSession|distance=0|elapsedMs=0|buildLanes\(/);
});

test('World Loop auto-starts an ambient race but never auto-plays sound',()=>{
  const source=read('src/js/games/world-loop.js');
  assert.match(source,/loadSelection\(\);renderPicker\(\);syncPace\(\);syncAudioUi\(\)/);
  assert.match(source,/beginSession\(String\(seed\)\+':ambient:'\+Date\.now\(\)\)/);
  const begin=source.slice(source.indexOf('function beginSession('),source.indexOf('function restartSession('));
  assert.doesNotMatch(begin,/playBackgroundMusic\(\)/);
  assert.match(source,/if\(!started\|\|!running\|\|audioLoading\)return/);
  assert.match(source,/soundToggleButton\.setAttribute\('aria-pressed',String\(audioUserPlaying\)\)/);
  assert.match(source,/audioNextStartTime=audioContext\.currentTime\+\.06;audioScheduleIndex=0/);
});

test('World Loop screensaver preserves controls and guidance through its standalone guide route',()=>{
  const html=read('dist/world-loop/index.html');
  const guide=read('dist/blog/how-to-play-world-loop/index.html');
  assert.match(html,/id="gameBoard"/);
  assert.match(html,/id="gameStatus"/);
  assert.match(guide,/Endless format/);
  assert.match(guide,/Controls and observation/);
});
