import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advanceEchoState} from '../src/js/games/echo-step.js';

test('Echo Step collision rules distinguish blocked YOU moves from terminal Echo replay failures',()=>{
  const playerBlocked={size:3,delay:2,blocked:[],playerBarriers:[1],echoBarriers:[],playerStart:0,echoStart:8,playerGoal:7,echoGoal:6};
  const blocked=advanceEchoState(playerBlocked,{player:0,echo:8,pending:[]},'r');
  assert.equal(blocked.ok,false);
  assert.equal(blocked.playerBlocked,true);
  assert.match(blocked.reason,/YOU cannot cross/);

  const echoFails={size:3,delay:0,blocked:[],playerBarriers:[],echoBarriers:[1],playerStart:6,echoStart:0,playerGoal:8,echoGoal:2};
  const failed=advanceEchoState(echoFails,{player:6,echo:0,pending:[]},'r');
  assert.equal(failed.ok,false);
  assert.equal(Boolean(failed.playerBlocked),false);
  assert.match(failed.reason,/Echo hit a cyan/);
});

test('Echo Step terminal failure locks nonessential controls and freezes time plus score',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  const built=fs.readFileSync('dist/assets/js/game-page.js','utf8');
  assert.match(source,/signalLock\(true,'failed'\)/);
  assert.match(source,/signalLock\(false\)/);
  assert.match(built,/engineLocked:false/);
  assert.match(built,/locked=Boolean\(state\.engineLocked\)/);
  assert.match(built,/done\|\|locked\|\|state\.solutionVisible/);
  assert.match(built,/done\|\|locked\);setDisabled\('#resetPuzzle'/);
  assert.match(built,/snapoki:game-lock/);
  assert.match(built,/if\(state\.engineLocked\)stopTimer\(\)/);
  assert.match(built,/function tick\(\)\{if\(state\.engineLocked\|\|state\.completed\)return;/);
});

test('Echo Step failure keeps Retry, Reset and New Puzzle available while Hint and Guide are locked',()=>{
  const built=fs.readFileSync('dist/assets/js/game-page.js','utf8');
  assert.match(built,/setDisabled\('#newPuzzle',state\.loading\)/);
  assert.match(built,/setDisabled\('#hint',[^;]*locked/);
  assert.match(built,/setDisabled\('#solution',[^;]*locked/);
  assert.match(built,/setDisabled\('#resetPuzzle',!ready\|\|\(done&&!state\.practiceComplete\)\)/);
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.match(source,/data-echo-reset>Retry/);
});

test('Echo Step failure banner sits above the rule bar and uses plain-language cause copy',()=>{
  const built=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  const bannerIndex=built.indexOf('<div class="echo-state-banner" role="status"');
  const ruleIndex=built.indexOf('<div class="echo-compact-bar"');
  const boardIndex=built.indexOf('<div class="echo-board-shell"><div class="echo-grid"');
  assert.ok(bannerIndex>=0&&ruleIndex>bannerIndex&&boardIndex>ruleIndex,'failure banner should appear above rules and board');
  assert.doesNotMatch(built,/Timeline failed/);
  assert.match(built,/Try another path in this puzzle\./);
  assert.match(built,/Echo hit a cyan wall\./);
  assert.match(built,/Echo hit a dark wall\./);
  assert.match(built,/data-echo-reset>Retry/);
});

test('Echo Step result modal removes redundant guest actions and uses Guide terminology',()=>{
  const built=fs.readFileSync('dist/assets/js/game-page.js','utf8');
  assert.match(built,/gameKey==='echo-step'\?\(visible\?'Exit Guide':'Guide'\)/);
  assert.match(built,/next\.hidden=!action;if\(!action\)return/);
  assert.match(built,/hasAccount\(\)\?'Unranked':'—'/);
});

test('Echo Step keyboard remains usable after clicking a board cell but not from toolbar buttons',()=>{
  const built=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  assert.match(built,/event\.target\?\.tagName==='BUTTON'&&!event\.target\?\.classList\?\.contains\('echo-cell'\)/);
});

test('Echo Step blocked cells remain clickable for feedback while terminal states truly disable the board',()=>{
  const built=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  assert.match(built,/cell\.disabled=complete\|\|failed/);
  assert.match(built,/aria-disabled',String\(sharedBlocked\.has\(index\)\|\|playerPhase\.has\(index\)\)/);
  assert.doesNotMatch(built,/cell\.disabled=sharedBlocked\.has\(index\)\|\|playerPhase\.has\(index\)/);
  assert.match(built,/showNotice\(title,message,'blocked',1300\);if\(attemptedTarget>=0\)flashCell/);
});

test('Echo Step NEXT danger preview only marks fixed Echo hazards before the next YOU move is known',()=>{
  const built=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  assert.match(built,/danger=target<0\|\|sharedBlocked\.has\(target\)\|\|echoPhase\.has\(target\)/);
  assert.doesNotMatch(built,/danger=[^;]*target===state\.player/);
});

test('Echo Step staged help copy matches the goal-first striped-cell UI',()=>{
  const page=fs.readFileSync('dist/echo-step/index.html','utf8');
  const guide=fs.readFileSync('dist/blog/how-to-play-echo-step/index.html','utf8');
  assert.doesNotMatch(page,/marked Y|marked E|Purple phase walls|Cyan phase walls/);
  assert.match(page,/<strong>Goal:<\/strong>/);
  assert.match(page,/Purple stops YOU only\. Cyan stops Echo only\. Dark stops both\./);
  assert.match(page,/If YOU cannot enter a cell, choose another direction/);
  assert.match(page,/Guide teaches one step at a time/);
  assert.doesNotMatch(guide,/Purple Y wall|Cyan E wall|E-markers/);
  assert.match(guide,/Purple:<\/strong> YOU cannot enter; Echo can pass through/);
  assert.match(guide,/Echo is different: it blindly replays/);
});
