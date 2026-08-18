import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {COLOR_CONNECT_REVIEW_SAMPLES,COLOR_CONNECT_REVIEW_BANDS,DEFAULT_COLOR_CONNECT_REVIEW_SEED,resolveColorConnectReview,colorConnectReviewUrl} from '../src/js/games/color-connect-review.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Color Connect calibration review exposes exactly the production 11-color sample set',()=>{
  assert.equal(COLOR_CONNECT_REVIEW_SAMPLES.length,12);
  assert.deepEqual(COLOR_CONNECT_REVIEW_BANDS,['80–87','87–91','91–94','94+']);
  for(const band of COLOR_CONNECT_REVIEW_BANDS)assert.equal(COLOR_CONNECT_REVIEW_SAMPLES.filter(sample=>sample.band===band).length,3);
  for(const sample of COLOR_CONNECT_REVIEW_SAMPLES){
    assert.match(sample.seed,/^color-v8-11-prod:h1:\d{3}$/);
    assert.ok(sample.score>=80);
    assert.ok(Number.isFinite(sample.backtracks)&&Number.isFinite(sample.greedyTraps));
  }
});

test('review query only resolves approved 11-color samples and has a stable boundary default',()=>{
  const off=resolveColorConnectReview(new URLSearchParams('review=0'));
  assert.equal(off,null);
  const fallback=resolveColorConnectReview(new URLSearchParams('review=1&reviewSeed=not-approved'));
  assert.equal(fallback.seed,DEFAULT_COLOR_CONNECT_REVIEW_SEED);
  assert.equal(fallback.score,85.5);
  const chosen=COLOR_CONNECT_REVIEW_SAMPLES.find(sample=>sample.score===94.3);
  const resolved=resolveColorConnectReview(new URLSearchParams(`review=1&reviewSeed=${encodeURIComponent(chosen.seed)}`));
  assert.deepEqual(resolved,chosen);
  assert.match(colorConnectReviewUrl(chosen),/^\/color-connect\/\?review=1&reviewSeed=/);
});

test('game lifecycle makes Color Connect Review Mode practice-only before any ranked write',()=>{
  const page=read('src/js/game-page.js');
  assert.match(page,/gameKey==='color-connect'\?resolveColorConnectReview/);
  assert.match(page,/async function rankedAttempt\([^)]*\)[\s\S]*?if\(review\)return null;/,'review must short-circuit ranked attempt creation');
  assert.match(page,/function guestSeed\([^)]*\)[\s\S]*?if\(review\)return review\.seed;/,'review must use the approved deterministic seed');
  assert.match(page,/if\(review\)\{state\.difficulty='hard';state\.mode='normal';return;\}/,'review must force Hard Regular mode');
  assert.match(page,/async function finishPuzzle\(\)[\s\S]*?if\(review\)\{finishPractice/,'review completion must exit before verified result construction');
  assert.match(page,/if\(rankedRun&&!review\)recordSolutionReveal/,'review solution must never record a server reveal');
  assert.match(page,/Practice-only\. No ranking or Daily progress writes\./);
});

test('Review Mode has explicit band/sample navigation and disables normal difficulty/mode controls',()=>{
  const page=read('src/js/game-page.js');
  for(const token of ['data-review-band','data-review-seed','Calibration Review','Restart Sample','Exit Review'])assert.match(page,new RegExp(token));
  assert.match(page,/button\.disabled=state\.loading\|\|reviewLocked/);
  assert.match(page,/dailyMode\.hidden=!capability\('daily'\)\|\|Boolean\(review\)/);
  assert.match(page,/dailySection\.hidden=!capability\('daily'\)\|\|Boolean\(review\)/);
  assert.ok(fs.existsSync(path.join(root,'dist/assets/js/games/color-connect-review.js')),'review sample module should ship with the built assets');
});
