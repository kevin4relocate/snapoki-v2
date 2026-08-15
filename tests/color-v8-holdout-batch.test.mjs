import test from 'node:test';
import assert from 'node:assert/strict';
import {runColorV8Calibration} from '../scripts/calibrate-color-v8.mjs';

test('Color Connect V8 holdout calibration', {timeout:240000}, async()=>{
  const report=await runColorV8Calibration({medium:100,hard:200,prefix:'color-v8-holdout-h1'});
  console.log('COLOR_V8_HOLDOUT_H1',JSON.stringify(report));
  assert.ok(report.medium.selected>=90,'holdout medium should produce enough valid samples');
  assert.ok(report.hard.selected>=175,'holdout hard should produce enough valid samples');
  assert.ok(report.hard.score.p50>report.medium.score.p50+15,'Hard median should remain materially separated from Medium');
  assert.ok(report.hard.referenceCutoffPassPct['85']>35,'a substantial Hard tail should remain above 85');
  assert.ok(report.medium.referenceCutoffPassPct['85']<5,'Medium leakage above 85 should stay rare');
});
