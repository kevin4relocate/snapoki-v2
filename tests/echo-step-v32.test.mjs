import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

test('Echo Step V3.3 keeps the board first with compact chrome and overlay feedback',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/echo-compact-bar/);
  assert.match(source,/echo-board-shell/);
  assert.match(source,/echo-rules-popover/);
  assert.doesNotMatch(source,/echo-phase-legend/);
  assert.match(css,/\.echo-board-shell \.echo-state-banner\{position:absolute/);
  assert.match(css,/\.echo-compact-bar/);
  assert.match(css,/\.echo-rules-popover/);
});

test('Echo Step V3.3 uses one terminal failure message only',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.match(source,/Timeline failed/);
  assert.match(source,/data-echo-reset/);
  assert.match(source,/friendlyFailure/);
  assert.match(source,/function fail\(message\).*onStatus\(''\)/s);
  assert.doesNotMatch(source,/Timeline failed · reset to retry/);
  assert.doesNotMatch(source,/This run cannot continue/);
});

test('Echo Step V3.3 Solution is guided practice one move at a time',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/function practiceStep\(\)/);
  assert.match(source,/Practice · Step \$\{guide\.index\+1\}\/\$\{puzzle\.solution\.length\}/);
  assert.match(source,/echo-practice-marker-you/);
  assert.match(source,/next\.textContent='NEXT'/);
  assert.match(source,/if\(solutionVisible\).*action!==expected/s);
  assert.match(source,/Follow NEXT/);
  assert.doesNotMatch(source,/Solution timeline/);
  assert.doesNotMatch(source,/echo-solution-turn/);
  assert.match(css,/\.echo-cell\.practice-next-player/);
  assert.match(css,/\.echo-practice-marker-you/);
});

test('Echo Step V3.3 removes on-board arrow controls and keeps walls optional',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.doesNotMatch(source,/echo-controls/);
  assert.doesNotMatch(source,/data-echo-move/);
  assert.match(source,/<summary>Walls<\/summary>/);
  assert.match(source,/Purple.*blocks YOU/s);
  assert.match(source,/Cyan.*blocks Echo/s);
  assert.match(source,/Dark.*blocks both/s);
  assert.match(source,/keyboard\/WASD or click an adjacent cell/);
});

test('difficulty reward labels no longer include EXPERT on any built game',()=>{
  const built=fs.readFileSync('dist/assets/js/game-page.js','utf8');
  assert.doesNotMatch(built,/EXPERT/);
  assert.match(built,/RANK PTS/);
});

test('Echo Step V3.3 UI module is valid JavaScript',()=>{
  execFileSync(process.execPath,['--check','src/js/games/echo-step-ui-v32.js'],{stdio:'pipe'});
});
