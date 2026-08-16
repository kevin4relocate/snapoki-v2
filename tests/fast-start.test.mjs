import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('src/js/api.js','utf8');

test('ranked attempt prefetch cannot hold first puzzle loading indefinitely',()=>{
  assert.match(api,/RANKED_PREFETCH_BUDGET_MS=900/);
  assert.match(api,/Promise\.race\(\[promise,timeout\]\)/);
  assert.match(api,/attemptInflight\.set\(key,request\)/);
  assert.match(api,/return withinRankedStartBudget\(request\)/);
  assert.match(api,/then\(data=>cacheRankedAttempt/);
});
