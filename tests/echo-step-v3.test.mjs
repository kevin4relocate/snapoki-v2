import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateEchoStep,simulateEchoStep} from '../src/js/games/echo-step.js';

test('Echo Step V3 keeps asymmetric barriers deterministic and solvable',()=>{
  for(const difficulty of ['easy','medium','hard'])for(let sample=0;sample<30;sample++){
    const seed=`echo-v3:${difficulty}:${sample}`;
    const a=generateEchoStep(difficulty,seed),b=generateEchoStep(difficulty,seed);
    assert.deepEqual({blocked:a.blocked,playerBarriers:a.playerBarriers,echoBarriers:a.echoBarriers,solution:a.solution},{blocked:b.blocked,playerBarriers:b.playerBarriers,echoBarriers:b.echoBarriers,solution:b.solution});
    assert.ok(a.playerBarriers.length>0);assert.ok(a.echoBarriers.length>0);
    assert.equal(new Set([...a.blocked,...a.playerBarriers,...a.echoBarriers]).size,a.blocked.length+a.playerBarriers.length+a.echoBarriers.length);
    assert.equal(simulateEchoStep(a,a.solution).solved,true);
  }
});

test('Echo Step previews the next Echo target and warns on danger',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8');
  const css=fs.readFileSync('src/styles/echo-step.css','utf8');
  assert.match(source,/function nextEchoPreview\(\)/);
  assert.match(source,/state\.pending\.length!==puzzle\.delay/);
  assert.match(source,/echo-next-target/);
  assert.match(source,/echo-next-danger/);
  assert.match(source,/echo-next-marker/);
  assert.match(source,/is-danger/);
  assert.match(css,/\.echo-cell\.echo-next-target/);
  assert.match(css,/\.echo-cell\.echo-next-danger/);
  assert.match(css,/\.echo-next-marker/);
  assert.match(css,/\.echo-queue b\.is-next\.is-danger/);
});
