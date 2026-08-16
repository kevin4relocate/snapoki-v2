import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Snapoki brand uses the interlocking Puzzle-S mark everywhere',()=>{
  const mark=read('dist/brand/logo-mark.svg');
  const favicon=read('dist/favicon.svg');
  const wordmark=read('dist/brand/logo.svg');
  for(const svg of [mark,favicon,wordmark]){
    assert.match(svg,/data-brand-version="puzzle-s-v2"/);
    assert.match(svg,/puzzle-seams/);
    assert.doesNotMatch(svg,/<circle\b/i,'old white endpoint dots must not return');
  }
  assert.match(read('scripts/generate-brand.mjs'),/const PUZZLE_SEAMS=/);
  for(const rel of ['dist/favicon-32.png','dist/apple-touch-icon.png','dist/brand/logo-mark-64.png','dist/brand/logo-mark-128.png','dist/brand/logo-mark-192.png','dist/brand/logo-mark-256.png','dist/brand/logo-mark-512.png','dist/brand/logo-mark-1024.png','dist/brand/social-card.png']){
    assert.ok(fs.statSync(path.join(root,rel)).size>100,`${rel} was not regenerated`);
  }
});
