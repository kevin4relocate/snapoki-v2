import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Echo Step shows wall rules inline instead of hiding them behind a popover',()=>{
  const css=fs.readFileSync('src/styles/echo-step-rulebar.css','utf8');
  assert.match(css,/\.echo-rules>summary\{display:none!important\}/);
  assert.match(css,/\.echo-rules:not\(\[open\]\)>\.echo-rules-popover\{position:static!important/);
  assert.match(css,/display:flex!important/);
  assert.match(css,/white-space:nowrap/);
});

test('Echo Step built page loads the always-visible rule bar stylesheet',()=>{
  const page=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(page,/\/assets\/styles\/echo-step-rulebar\.css/);
});
