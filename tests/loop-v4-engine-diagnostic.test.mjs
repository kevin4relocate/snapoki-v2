import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLoopPuzzle,isValidLoopSolution} from '../src/js/games/loop-puzzle-v4-engine.js';

for(const difficulty of ['easy','medium','hard'])test(`Loop V4 engine ${difficulty}`,()=>{
  for(const seed of ['loop-v4-a','loop-v4-b','quality-a','quality-b']){
    const p=generateLoopPuzzle(difficulty,seed),q=p.quality;
    console.log('LOOP_V4_ENGINE',JSON.stringify({difficulty,seed,size:p.size,clues:p.clues.length,score:+q.score.toFixed(1),shape:{turns:q.shape.turns,longest:q.shape.longestStraight,perimeter:+q.shape.perimeterRatio.toFixed(2),interior:+q.shape.interiorRatio.toFixed(2),reEntries:q.shape.reEntries,span:[q.shape.spanRows,q.shape.spanCols],score:+q.shape.score.toFixed(1)},cluesQ:q.clues,solver:q.solver,necessity:{avg:+q.necessity.average.toFixed(2),weak:q.necessity.weak,meaningful:q.necessity.meaningful}}));
    assert.equal(p.version,4);assert.equal(isValidLoopSolution(new Set(p.solution),p),true);
  }
});
