import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Bridges hides the zero-progress SVG ring cap and reveals it only after progress',()=>{
  const presentation=fs.readFileSync('src/js/game-presentation.js','utf8');
  const css=fs.readFileSync('src/styles/bridges-progress-fix.css','utf8');
  assert.match(presentation,/styles:\['bridges\.css','bridges-progress-fix\.css'\]/);
  assert.match(css,/\.bridges-island-progress\{opacity:0\}/);
  assert.match(css,/\.bridges-island\.is-progress \.bridges-island-progress\{opacity:\.86\}/);
  assert.match(css,/\.bridges-island\.is-satisfied \.bridges-island-progress\{opacity:1\}/);
});
