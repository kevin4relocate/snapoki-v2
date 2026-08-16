import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

test('Echo Step V3.2 makes failure and unsynced goal states explicit',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/echo-state-banner/);
  assert.match(source,/Timeline failed/);
  assert.match(source,/This run cannot continue/);
  assert.match(source,/data-echo-reset/);
  assert.match(source,/YOU reached P — not solved yet/);
  assert.match(source,/Echo must reach E on the same turn/);
  assert.match(source,/Echo reached E — not solved yet/);
  assert.match(css,/\.echo-state-banner\.is-failed/);
  assert.match(css,/\.echo-state-banner\.is-waiting-player/);
});

test('Echo Step V3.2 solution is a delayed turn timeline instead of an arrow-filled board',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),entry=fs.readFileSync('src/js/games/echo-step.js','utf8');
  assert.match(source,/Solution timeline/);
  assert.match(source,/Echo repeats the same commands \$\{puzzle\.delay\} turns later/);
  assert.match(source,/echo-solution-turn/);
  assert.match(source,/index>=puzzle\.delay\?puzzle\.solution\[index-puzzle\.delay\]/);
  assert.doesNotMatch(source,/echo-route-arrow/);
  assert.match(entry,/createGame.*echo-step-ui-v32\.js/);
});

test('Echo Step V3.2 removes on-board arrow controls and clarifies striped phase walls',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.doesNotMatch(source,/echo-controls/);
  assert.doesNotMatch(source,/data-echo-move/);
  assert.match(source,/Purple stripes/);
  assert.match(source,/YOU blocked/);
  assert.match(source,/Cyan stripes/);
  assert.match(source,/Echo blocked/);
  assert.match(source,/Dark stripes/);
  assert.match(source,/keyboard\/WASD or click an adjacent cell/);
});

test('difficulty reward labels no longer include EXPERT on any built game',()=>{
  const built=fs.readFileSync('dist/assets/js/game-page.js','utf8');
  assert.doesNotMatch(built,/EXPERT/);
  assert.match(built,/RANK PTS/);
});

test('Echo Step V3.2 UI module is valid JavaScript',()=>{
  execFileSync(process.execPath,['--check','src/js/games/echo-step-ui-v32.js'],{stdio:'pipe'});
});
