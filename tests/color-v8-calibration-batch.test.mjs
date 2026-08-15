import test from 'node:test';
import assert from 'node:assert/strict';
import {runColorV8Calibration} from '../scripts/calibrate-color-v8.mjs';

test('Color Connect V8 calibration batch 1', {timeout:180000}, async()=>{
  const report=await runColorV8Calibration({medium:60,hard:100,prefix:'color-v8-calibration-b1'});
  console.log('COLOR_V8_CALIBRATION_B1',JSON.stringify(report));
  assert.ok(report.medium.selected>=50,'medium calibration should produce enough valid samples');
  assert.ok(report.hard.selected>=80,'hard calibration should produce enough valid samples');
});
