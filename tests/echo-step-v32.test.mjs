import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

test('Echo Step keeps failure and unsynced goal states explicit without duplicate terminal copy',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/Timeline failed/);
  assert.match(source,/data-echo-reset>Retry/);
  assert.match(source,/P reached — sync missing/);
  assert.match(source,/Echo reached E — sync missing/);
  assert.match(source,/function fail\(message\).*onStatus\(''\)/s);
  assert.match(css,/\.echo-state-banner\.is-failed/);
  assert.match(css,/\.echo-state-banner\.is-waiting-player/);
});

test('Echo Step guided solution reveals only the next move instead of painting the full route',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),entry=fs.readFileSync('src/js/games/echo-step.js','utf8');
  assert.match(source,/Guide · \$\{guide\.index\+1\}\/\$\{puzzle\.solution\.length\}/);
  assert.match(source,/practice-next-player/);
  assert.match(source,/echo-practice-marker-you/);
  assert.match(source,/Follow NEXT/);
  assert.doesNotMatch(source,/solutionPlayerCells|solutionEchoCells|Solution timeline/);
  assert.match(entry,/createGame.*echo-step-ui-v32\.js/);
});

test('Echo Step top chrome explains the delay and walls in one glance',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/\$\{puzzle\.delay\}-turn delay/);
  assert.match(source,/Purple[\s\S]*YOU ✕[\s\S]*ECHO ✓/);
  assert.match(source,/Cyan[\s\S]*YOU ✓[\s\S]*ECHO ✕/);
  assert.match(source,/Dark[\s\S]*YOU ✕[\s\S]*ECHO ✕/);
  assert.match(source,/✕ cannot enter · ✓ can pass through/);
  assert.doesNotMatch(source,/marker\.textContent='Y'|marker\.textContent='E'/);
  assert.match(css,/\.wall-swatch-you/);
  assert.match(css,/\.echo-compact-bar\{min-height:32px;font-size:11px/);
  assert.match(css,/\.echo-rules-popover b\{font-size:11px/);
});

test('Echo Step uses E only for Echo identity and changes delayed target telegraph to NEXT',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.match(source,/token\.textContent='E';token\.setAttribute\('aria-label','Echo'\)/);
  assert.match(source,/next\.textContent=echoPreview\.danger\?'!':'NEXT'/);
  assert.match(source,/Cyan wall: Echo cannot enter; YOU can pass through/);
});

test('Echo Step adds tactile feedback to accepted YOU and Echo movement',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/flashCell\(state\.player,'just-moved-you'\)/);
  assert.match(source,/flashCell\(state\.echo,'just-moved-echo'\)/);
  assert.match(css,/@keyframes echo-you-pop/);
  assert.match(css,/@keyframes echo-ghost-pop/);
  assert.match(css,/prefers-reduced-motion/);
});

test('Echo Step removes on-board arrow controls and keeps wall help optional',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.doesNotMatch(source,/echo-controls/);
  assert.doesNotMatch(source,/data-echo-move/);
  assert.match(source,/<summary>Walls<\/summary>/);
});

test('difficulty reward labels no longer include EXPERT on any built game',()=>{
  const built=fs.readFileSync('dist/assets/js/game-page.js','utf8');
  assert.doesNotMatch(built,/EXPERT/);
  assert.match(built,/RANK PTS/);
});

test('Echo Step UI module is valid JavaScript',()=>{
  execFileSync(process.execPath,['--check','src/js/games/echo-step-ui-v32.js'],{stdio:'pipe'});
});
