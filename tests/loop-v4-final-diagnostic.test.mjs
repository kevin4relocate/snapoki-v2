import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLoopPuzzle,isValidLoopSolution} from '../src/js/games/loop-puzzle-v4-final-engine.js';

for(const difficulty of ['medium','hard'])test(`Loop V4 balanced ${difficulty}`,()=>{
  for(const seed of ['loop-v4-a','loop-v4-b','quality-a','quality-b']){
    const p=generateLoopPuzzle(difficulty,seed),q=p.quality;
    console.log('LOOP_V4_FINAL',JSON.stringify({difficulty,seed,clues:p.clues.length,score:+q.score.toFixed(1),shape:{turns:q.shape.turns,longest:q.shape.longestStraight,perimeter:+q.shape.perimeterRatio.toFixed(2),interior:+q.shape.interiorRatio.toFixed(2),span:[q.shape.spanRows,q.shape.spanCols]},mix:q.clues,solver:q.solver,necessity:{avg:+q.necessity.average.toFixed(2),weak:q.necessity.weak,meaningful:q.necessity.meaningful}}));
    assert.equal(isValidLoopSolution(new Set(p.solution),p),true);
    if(difficulty==='hard'){assert.ok(q.shape.turns>=28);assert.ok(q.shape.longestStraight<=4);assert.ok(q.shape.perimeterRatio<=.22);assert.ok(q.clues.zeros>=2&&q.clues.zeros<=6);assert.ok(q.clues.ones>=2);assert.equal(q.clues.zero2x2,0);assert.equal(q.clues.longOneRuns,0);}
  }
});
