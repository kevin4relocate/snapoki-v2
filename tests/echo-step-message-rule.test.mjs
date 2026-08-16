import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Echo Step messages use plain language and state-driven persistence',()=>{
  const js=fs.readFileSync('dist/assets/js/games/echo-step-ui-v32.js','utf8');
  assert.doesNotMatch(js,/Timeline failed|Move blocked|not synced|Echo memory|-turn delay/);
  assert.match(js,/YOU can’t move off the board\./);
  assert.match(js,/YOU can’t enter dark cells\./);
  assert.match(js,/YOU can’t enter purple cells\./);
  assert.match(js,/Echo is in that cell\./);
  assert.match(js,/YOU reached P\./);
  assert.match(js,/Echo isn’t at E yet\./);
  assert.match(js,/Echo reached E\./);
  assert.match(js,/Reach P while Echo is still on E\./);
  assert.match(js,/Echo will replay/);
  assert.match(js,/\$\{puzzle\.delay\} turns later/);
  assert.doesNotMatch(js,/repeats \$\{puzzle\.delay\} turns later/);
  assert.match(js,/duration>0&&type!=='blocked'/);
});

test('Echo Step state messages overlay the rule row without moving the board',()=>{
  const css=fs.readFileSync('dist/assets/styles/echo-step-polish.css','utf8');
  const rulebar=fs.readFileSync('dist/assets/styles/echo-step-rulebar.css','utf8');
  assert.match(css,/\.echo-stage>\.echo-state-banner\{position:absolute/);
  assert.doesNotMatch(css,/\.echo-board-shell \.echo-state-banner/);
  assert.match(rulebar,/min-height:56px!important/);
});

test('Echo Step launch help copy avoids internal timeline jargon',()=>{
  const page=fs.readFileSync('dist/echo-step/index.html','utf8');
  const guide=fs.readFileSync('dist/blog/how-to-play-echo-step/index.html','utf8');
  assert.doesNotMatch(page,/timeline fails|ends the timeline|two timelines at once/i);
  assert.doesNotMatch(guide,/timeline fails|ends the timeline|two timelines at once/i);
});
