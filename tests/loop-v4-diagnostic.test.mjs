import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLoopPuzzle} from '../src/js/games/loop-puzzle-v4.js';

for(const difficulty of ['easy','medium','hard']){
  test(`Loop V4 diagnostic ${difficulty}`,()=>{
    for(const seed of ['loop-v4-a','loop-v4-b','quality-a','quality-b']){
      const p=generateLoopPuzzle(difficulty,seed),q=p.quality;
      console.log('LOOP_V4',JSON.stringify({difficulty,seed,size:p.size,clues:p.clues.length,score:Math.round(q.score*10)/10,shape:{turns:q.shape.turns,longest:q.shape.longestStraight,perimeter:+q.shape.perimeterRatio.toFixed(2),interior:+q.shape.interiorRatio.toFixed(2),reEntries:q.shape.reEntries,score:+q.shape.score.toFixed(1)},cluesQ:q.clues,solver:q.solver,necessity:{average:+q.necessity.average.toFixed(2),weak:q.necessity.weak}}));
      assert.equal(p.version,4);
      assert.ok(p.solution.length>4);
    }
  });
}
