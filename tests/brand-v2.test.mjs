import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Snapoki brand uses the refined Puzzle-S seams everywhere',()=>{
  const mark=read('dist/brand/logo-mark.svg');
  const favicon=read('dist/favicon.svg');
  const wordmark=read('dist/brand/logo.svg');
  for(const svg of [mark,favicon,wordmark]){
    assert.match(svg,/data-brand-version="puzzle-s-v3"/);
    assert.match(svg,/class="puzzle-seams"/);
    assert.doesNotMatch(svg,/<circle\b/i,'old endpoint dots must not return');
  }
  const generator=read('scripts/generate-brand.mjs');
  assert.match(generator,/const SEAM_SPECS=/);
  assert.match(generator,/function puzzleSeam\(/);
  assert.doesNotMatch(generator,/const PUZZLE_SEAMS=/,'symbol-like seam overlays must not return');
  for(const rel of ['dist/favicon-32.png','dist/apple-touch-icon.png','dist/brand/logo-mark-64.png','dist/brand/logo-mark-128.png','dist/brand/logo-mark-192.png','dist/brand/logo-mark-256.png','dist/brand/logo-mark-512.png','dist/brand/logo-mark-1024.png','dist/brand/social-card.png']){
    assert.ok(fs.statSync(path.join(root,rel)).size>100,`${rel} was not regenerated`);
  }
});
