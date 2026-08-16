import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Echo Step shows wall rules inline instead of hiding them behind a popover',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8');
  assert.match(source,/echo-rule-strip/);
  assert.doesNotMatch(source,/<details class="echo-rules"|<summary>Walls<\/summary>|echo-rules-popover/);
  assert.match(css,/\.echo-rule-strip\{display:flex/);
  assert.match(css,/white-space:nowrap/);
});

test('desktop keeps Purple, Cyan and Dark visible without horizontal rule scrolling',()=>{
  const css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8'),contract=fs.readFileSync('src/styles/board-contract.css','utf8'),polish=fs.readFileSync('scripts/echo-step-message-polish.mjs','utf8');
  assert.match(css,/@media\(min-width:641px\)[\s\S]*\.echo-compact-bar\{[^}]*overflow:visible!important/);
  assert.match(css,/@media\(max-width:640px\)[\s\S]*overflow-x:auto/);
  assert.match(contract,/\.echo-compact-bar\{overflow:visible/);
  assert.match(contract,/@media\(max-width:640px\)\{\.echo-compact-bar\{overflow-x:auto/);
  assert.match(polish,/<small>\$\{puzzle\.delay\} turns later<\/small>/);
  assert.doesNotMatch(polish,/repeats \$\{puzzle\.delay\} turns later/);
});

test('Echo Step built page loads the always-visible rule bar stylesheet',()=>{
  const page=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(page,/\/assets\/styles\/echo-step-rulebar\.css/);
});
