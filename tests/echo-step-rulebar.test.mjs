import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Echo Step shows wall rules inline instead of hiding them behind a popover',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8');
  assert.match(source,/echo-rule-strip/);
  assert.doesNotMatch(source,/<details class="echo-rules"|<summary>Walls<\/summary>|echo-rules-popover/);
  assert.match(css,/\.echo-rule-strip\{display:flex/);
  assert.match(css,/white-space:nowrap/);
  assert.match(css,/overflow-x:auto/);
});

test('Echo Step built page loads the always-visible rule bar stylesheet',()=>{
  const page=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(page,/\/assets\/styles\/echo-step-rulebar\.css/);
});
