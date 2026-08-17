import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateEchoStep,simulateEchoStep} from '../src/js/games/echo-step.js';
import {scoreTimeDivisor} from '../src/js/games/utils.js';

const snapshot=puzzle=>({
  blocked:puzzle.blocked,
  playerBarriers:puzzle.playerBarriers,
  echoBarriers:puzzle.echoBarriers,
  playerStart:puzzle.playerStart,
  echoStart:puzzle.echoStart,
  playerGoal:puzzle.playerGoal,
  echoGoal:puzzle.echoGoal,
  solution:puzzle.solution,
  temporal:puzzle.temporal
});

test('Echo Step V4 keeps Easy approachable while Medium and Hard become deterministic temporal mazes',()=>{
  for(const difficulty of ['easy','medium','hard'])for(let sample=0;sample<24;sample++){
    const seed=`echo-v4:${difficulty}:${sample}`;
    const a=generateEchoStep(difficulty,seed),b=generateEchoStep(difficulty,seed);
    assert.deepEqual(snapshot(a),snapshot(b),`${difficulty} ${sample} must regenerate exactly`);
    assert.equal(simulateEchoStep(a,a.solution).solved,true,`${difficulty} ${sample} canonical solution must remain valid`);
    assert.equal(a.generatorVersion,4);
    if(difficulty==='easy'){
      assert.equal(a.phaseVersion,1);
      assert.ok(a.solutionMoves>=8&&a.solutionMoves<=11);
      assert.equal(a.temporal,undefined);
    }else{
      assert.equal(a.phaseVersion,2);
      assert.equal(a.temporal.goalReentry,true);
    }
  }
});

test('Medium V4 requires a longer crooked route with delayed false choices and goal re-entry',()=>{
  for(let sample=0;sample<30;sample++){
    const puzzle=generateEchoStep('medium',`echo-v4-medium-gate:${sample}`),quality=puzzle.temporal;
    assert.ok(puzzle.solutionMoves>=28);
    assert.ok(puzzle.turns>=15);
    assert.ok(quality.decisionPoints>=5);
    assert.ok(quality.delayedTraps>=4);
    assert.ok(quality.deepTraps>=1);
    assert.ok(quality.shortcutDecoys>=1);
    assert.ok(quality.lateFailureDepth>=4);
    assert.equal(quality.reentryMoves,4);
  }
});

test('Hard V4 forces deep timing pressure instead of a direct read from Echo to E',()=>{
  for(let sample=0;sample<30;sample++){
    const puzzle=generateEchoStep('hard',`echo-v4-hard-gate:${sample}`),quality=puzzle.temporal;
    assert.ok(puzzle.solutionMoves>=42);
    assert.ok(puzzle.turns>=24);
    assert.ok(quality.decisionPoints>=7);
    assert.ok(quality.delayedTraps>=6);
    assert.ok(quality.deepTraps>=2);
    assert.ok(quality.shortcutDecoys>=2);
    assert.ok(quality.maxFalseRouteDepth>=3);
    assert.ok(quality.lateFailureDepth>=6);
    assert.equal(quality.reentryMoves,6);
  }
});

test('V4 score pacing gives Medium and Hard enough time for deliberate solving',()=>{
  assert.equal(scoreTimeDivisor('echo-step','easy'),50);
  assert.equal(scoreTimeDivisor('echo-step','medium'),140);
  assert.equal(scoreTimeDivisor('echo-step','hard'),300);
});

test('V4 generation stays bounded and does not add a runtime full-state solver',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-core.js','utf8');
  assert.match(source,/candidateBudget:36/);
  assert.match(source,/candidateBudget:44/);
  assert.match(source,/nodeBudget=14000/);
  assert.doesNotMatch(source,/while\s*\(\s*true\s*\)/);
  assert.doesNotMatch(source,/solveTemporal|temporalBfs|temporalDfs/i);
});
