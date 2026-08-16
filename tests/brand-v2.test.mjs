import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Snapoki brand uses the six-piece Puzzle-S v5 everywhere',()=>{
  const mark=read('dist/brand/logo-mark.svg');
  const favicon=read('dist/favicon.svg');
  const wordmark=read('dist/brand/logo.svg');
  for(const svg of [mark,favicon,wordmark]){
    assert.match(svg,/data-brand-version="puzzle-s-v5"/);
    assert.match(svg,/class="puzzle-pieces"/);
    assert.match(svg,/class="puzzle-tabs"/);
    assert.match(svg,/class="puzzle-tab"/);
    assert.doesNotMatch(svg,/class="puzzle-seams"/,'overlay seam strokes must not return');
  }
  const generator=read('scripts/generate-brand.mjs');
  assert.match(generator,/const PIECE_COUNT=6, PIECE_GAP=\.012/);
  assert.match(generator,/const BUMP_INDEXES=\[0,2,4\]/);
  assert.match(generator,/const BEZIERS=\[/,'SVG and raster must share the same smooth S geometry');
  assert.match(generator,/function pathSlice\(/);
  assert.doesNotMatch(generator,/function puzzleSeam\(/,'old seam-overlay generator must not return');
  assert.doesNotMatch(generator,/SEAM_SPECS/,'old seam specs must not return');
  for(const rel of ['dist/favicon-32.png','dist/apple-touch-icon.png','dist/brand/logo-mark-64.png','dist/brand/logo-mark-128.png','dist/brand/logo-mark-192.png','dist/brand/logo-mark-256.png','dist/brand/logo-mark-512.png','dist/brand/logo-mark-1024.png','dist/brand/social-card.png'])assert.ok(fs.statSync(path.join(root,rel)).size>100,`${rel} was not regenerated`);
});
