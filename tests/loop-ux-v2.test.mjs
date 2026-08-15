import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const loop=fs.readFileSync('src/js/games/loop-puzzle.js','utf8');
const engine=fs.readFileSync('src/js/games/loop-puzzle-v4-engine.js','utf8');
const finalEngine=fs.readFileSync('src/js/games/loop-puzzle-v4-final-engine.js','utf8');
const css=fs.readFileSync('src/styles/polish-v3.css','utf8');

test('Loop Puzzle keeps plain clue typography with no clue chips',()=>{
  assert.doesNotMatch(loop,/loop-clue-chip/);
  assert.match(loop,/class',`loop-clue clue-\$\{clue\.value\}`/);
  assert.match(css,/\.loop-clue\.satisfied/);
  assert.match(css,/\.loop-clue\.conflict/);
  assert.doesNotMatch(css,/loop-clue-chip/);
});

test('Loop Puzzle Hint points to an exact edge from the first hint',()=>{
  assert.match(loop,/loop-hint-marker/);
  assert.match(loop,/hintRemove\?'×':'\+'/);
  assert.match(loop,/setHint\(safe,false\)/);
  assert.match(loop,/setHint\(conflict,true\)/);
  assert.match(css,/\.loop-hit\.hinted/);
  assert.match(css,/\.loop-hit\.hint-remove/);
  assert.match(css,/\.loop-hint-marker/);
});

test('Loop Puzzle V4 uses direct-cycle shape gates strategic clue mixing and order-free solution',()=>{
  assert.match(loop,/loop-puzzle-v4-final-engine/);
  for(const token of ['earOptions','growCycle','shapeGate','perimeterRatio','longestStraight','weightedClueSet','strategicPattern'])assert.match(engine,new RegExp(token));
  for(const token of ['rebalanceClues','mixTargets','leaveOneOut','zeroAdj','longOneRuns'])assert.match(finalEngine,new RegExp(token));
  assert.match(loop,/solution-edge/);
  assert.doesNotMatch(loop,/solutionStep\(/);
});
