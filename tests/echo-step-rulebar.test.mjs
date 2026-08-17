import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Echo Step shows goal and wall rules inline instead of hiding them behind a popover',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8');
  assert.match(source,/echo-rule-strip/);
  assert.doesNotMatch(source,/<details class="echo-rules"|<summary>Walls<\/summary>|echo-rules-popover/);
  assert.match(css,/Echo Step two-row HUD/);
  assert.match(css,/grid-template-areas:"you arrow echo goal" "rules rules rules rules"/);
  assert.match(css,/\.echo-goal-strip\{grid-area:goal/);
  assert.match(source,/echo-goal-strip/);
  assert.match(source,/YOU → P/);
  assert.match(source,/ECHO → E/);
  assert.match(css,/\.echo-rule-strip\{grid-area:rules;width:100%;display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/white-space:nowrap/);
});

test('two-row HUD keeps goal, delay and all wall rules visible without horizontal scrolling',()=>{
  const css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8'),contract=fs.readFileSync('src/styles/board-contract.css','utf8'),source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  assert.doesNotMatch(css,/overflow-x:auto/);
  assert.doesNotMatch(contract,/overflow-x:auto/);
  assert.match(contract,/\.echo-compact-bar\{overflow:visible;justify-content:center\}/);
  assert.match(source,/<small>\$\{puzzle\.delay\} turns later<\/small>/);
  assert.doesNotMatch(source,/repeats \$\{puzzle\.delay\} turns later/);
  assert.match(css,/min-height:56px!important/);
});

test('Echo Step built page loads the always-visible rule bar stylesheet',()=>{
  const page=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(page,/\/assets\/styles\/echo-step-rulebar\.css/);
});
