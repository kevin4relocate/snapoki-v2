import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLoopPuzzle,isValidLoopSolution} from '../src/js/games/loop-puzzle.js';

for(const difficulty of ['easy','medium','hard'])test(`Loop V4.1 ${difficulty} remains deterministic and valid`,()=>{
  const a=generateLoopPuzzle(difficulty,`loop-v4-${difficulty}`),b=generateLoopPuzzle(difficulty,`loop-v4-${difficulty}`);
  assert.deepEqual(a,b);
  assert.equal(a.version,4.1);
  assert.equal(isValidLoopSolution(new Set(a.solution),a),true);
});

test('Loop V4.1 Hard preserves complex geometry while balancing clue composition',()=>{
  for(const seed of ['loop-v4-a','quality-a','loop-v41-balance']){
    const p=generateLoopPuzzle('hard',seed),q=p.quality;
    assert.ok(q.shape.turns>=28);
    assert.ok(q.shape.longestStraight<=4);
    assert.ok(q.shape.perimeterRatio<=.22);
    assert.ok(q.shape.interiorRatio>=.78);
    assert.ok(q.clues.zeros>=2&&q.clues.zeros<=4);
    assert.ok(q.clues.ones>=2&&q.clues.ones<=4);
    assert.ok(q.clues.twos>=6,'Hard should use 2s as the main ambiguity backbone');
    assert.ok(q.clues.threes>=7&&q.clues.threes<=11,'Hard must not spam 3 clues');
    assert.equal(q.clues.zeroAdj,0);
    assert.equal(q.clues.zero2x2,0);
    assert.equal(q.clues.longOneRuns,0);
    assert.equal(q.clues.three2x2,0,'Hard cannot expose a 2x2 block of 3 clues');
    assert.equal(q.clues.longThreeRuns,0,'Hard cannot expose free 3-3-3 rows or columns');
    assert.ok(q.solver.backtracks>=20);
    assert.ok(q.solver.decisions>=40);
    assert.ok(q.necessity.meaningful>=Math.floor(p.clues.length*.55));
  }
});
