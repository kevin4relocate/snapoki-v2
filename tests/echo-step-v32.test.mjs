import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

test('Echo Step keeps failure and waiting-goal states explicit without technical jargon',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.doesNotMatch(source,/Timeline failed|not synced/);
  assert.match(source,/data-echo-reset>Retry/);
  assert.match(source,/YOU reached P\./);
  assert.match(source,/Echo reached E\./);
  assert.match(source,/Try another path in this puzzle\./);
  assert.match(source,/function fail\(message\).*signalLock\(true,'failed'\).*onStatus\(''\)/s);
  assert.match(css,/\.echo-state-banner\.is-failed/);
  assert.match(css,/\.echo-state-banner\.is-waiting-player/);
});

test('Echo Step guided solution reveals only the next move instead of painting the full route',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),entry=fs.readFileSync('src/js/games/echo-step.js','utf8');
  assert.match(source,/Guide · \$\{guide\.index\+1\}\/\$\{puzzle\.solution\.length\}/);
  assert.match(source,/practice-next-player/);
  assert.match(source,/echo-practice-marker-you/);
  assert.match(source,/Follow the highlighted NEXT cell/);
  assert.doesNotMatch(source,/solutionPlayerCells|solutionEchoCells|Solution timeline/);
  assert.match(entry,/createGame.*echo-step-ui-v32\.js/);
});

test('Echo Step top chrome explains the delay, goal and walls in one glance',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8');
  assert.match(source,/\$\{puzzle\.delay\} turns later/);
  assert.match(source,/echo-goal-strip/);
  assert.match(source,/echo-rule-strip/);
  assert.match(source,/Purple[\s\S]*YOU ✕[\s\S]*ECHO ✓/);
  assert.match(source,/Cyan[\s\S]*YOU ✓[\s\S]*ECHO ✕/);
  assert.match(source,/Dark[\s\S]*YOU ✕[\s\S]*ECHO ✕/);
  assert.doesNotMatch(source,/<summary>Walls<\/summary>|echo-rules-popover/);
  assert.match(css,/\.echo-rule-strip/);
  assert.match(css,/white-space:nowrap/);
});

test('Echo Step uses E only for Echo identity and changes delayed target telegraph to NEXT',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.match(source,/token\.textContent='E';token\.setAttribute\('aria-label','Echo'\)/);
  assert.match(source,/next\.textContent=echoPreview\.danger\?'!':'NEXT'/);
  assert.match(source,/Cyan: Echo cannot enter; YOU can pass through/);
});

test('Echo Step gives immediate board-local feedback for blocked YOU moves',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8');
  assert.match(source,/friendlyBlock/);
  assert.match(source,/showNotice\(title,message,'blocked',1300\)/);
  assert.match(source,/echo-blocked-attempt/);
  assert.match(css,/\.echo-state-banner\.is-notice\.is-blocked/);
  assert.match(css,/@keyframes echo-blocked-attempt/);
});

test('Echo Step adds tactile feedback to accepted YOU and Echo movement',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/flashCell\(state\.player,'just-moved-you'\)/);
  assert.match(source,/flashCell\(state\.echo,'just-moved-echo'\)/);
  assert.match(css,/@keyframes echo-you-pop/);
  assert.match(css,/@keyframes echo-ghost-pop/);
  assert.match(css,/prefers-reduced-motion/);
});

test('Echo Step removes on-board arrow controls and keeps rules always visible',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.doesNotMatch(source,/echo-controls/);
  assert.doesNotMatch(source,/data-echo-move/);
  assert.match(source,/aria-label="Echo Step rules"/);
  assert.match(source,/echo-rule-strip/);
});

test('difficulty reward labels no longer include EXPERT on any built game',()=>{
  const built=fs.readFileSync('dist/assets/js/game-page.js','utf8');
  assert.doesNotMatch(built,/EXPERT/);
  assert.match(built,/RANK PTS/);
});

test('Echo Step UI module is valid JavaScript',()=>{
  execFileSync(process.execPath,['--check','src/js/games/echo-step-ui-v32.js'],{stdio:'pipe'});
});
