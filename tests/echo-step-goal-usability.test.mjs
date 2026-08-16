import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Echo Step makes the winning goal obvious before play',()=>{
  const js=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  assert.match(js,/echo-goal-strip/);
  assert.match(js,/Goal: YOU to P and Echo to E on the same turn/);
  assert.match(js,/YOU → P/);
  assert.match(js,/ECHO → E/);
  assert.match(js,/SAME TURN/);
});

test('Easy Echo Step teaches P and E on the board until the first accepted move',()=>{
  const js=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  const css=fs.readFileSync('dist/assets/styles/echo-step-rulebar.css','utf8');
  assert.match(js,/showGoalCue=difficulty==='easy'&&moves===0&&!solutionVisible&&!failed&&!complete/);
  assert.match(js,/goal-onboarding-player/);
  assert.match(js,/goal-onboarding-echo/);
  assert.match(js,/echo-goal-cue-you/);
  assert.match(js,/echo-goal-cue-echo/);
  assert.match(css,/echo-goal-pulse-you/);
  assert.match(css,/echo-goal-pulse-echo/);
});

test('Echo Step How to Play is compact, goal-first and has no orphan numbering',()=>{
  const page=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(page,/class="echo-howto"/);
  assert.match(page,/class="echo-howto-you">YOU → P<\/b>/);
  assert.match(page,/class="echo-howto-echo">Echo → E<\/b>/);
  assert.match(page,/<em>Same turn<\/em>/);
  assert.match(page,/<strong>Move<\/strong>/);
  assert.match(page,/<strong>Walls<\/strong>/);
  assert.match(page,/<strong>Avoid<\/strong>/);
  assert.match(page,/<b>Hint<\/b> · next 3 moves/);
  assert.match(page,/<b>Guide<\/b> · step-by-step practice/);
  assert.doesNotMatch(page,/<p><strong>1\.<\/strong>/);
  assert.doesNotMatch(page,/not synced|timeline failed|phase wall/i);
});

test('Practice completion does not repeat the technical Synced status below the board',()=>{
  const js=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  assert.doesNotMatch(js,/✓ Synced/);
  assert.match(js,/if\(complete\|\|failed\)return'';/);
});

test('Retry copy says explicitly that the player stays on the same puzzle',()=>{
  const js=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  assert.match(js,/Try another path in this puzzle\./);
  assert.doesNotMatch(js,/Try a different route\./);
});
