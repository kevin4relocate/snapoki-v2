import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const loop=fs.readFileSync('src/js/games/loop-puzzle.js','utf8');
const css=fs.readFileSync('src/styles/polish-v3.css','utf8');

test('Loop Puzzle V2 uses plain clue typography with no clue chips',()=>{
  assert.doesNotMatch(loop,/loop-clue-chip/);
  assert.match(loop,/class',`loop-clue clue-\$\{clue\.value\}`/);
  assert.match(css,/\.loop-clue\.satisfied/);
  assert.match(css,/\.loop-clue\.conflict/);
  assert.doesNotMatch(css,/loop-clue-chip/);
});

test('Loop Puzzle Hint V2 points to an exact edge from the first hint',()=>{
  assert.match(loop,/loop-hint-marker/);
  assert.match(loop,/hintRemove\?'×':'\+'/);
  assert.match(loop,/setHint\(safe,false\)/);
  assert.match(loop,/setHint\(conflict,true\)/);
  assert.doesNotMatch(loop,/inspect clues near row/);
  assert.doesNotMatch(loop,/A safe .* edge is available there/);
  assert.match(css,/\.loop-hit\.hinted/);
  assert.match(css,/\.loop-hit\.hint-remove/);
  assert.match(css,/\.loop-hint-marker/);
});

test('Loop Puzzle keeps current difficulty engine and order-free solution',()=>{
  assert.match(loop,/easy:\{size:5,clueRate:\.90\}/);
  assert.match(loop,/medium:\{size:7,clueRate:\.58\}/);
  assert.match(loop,/hard:\{size:9,clueRate:\.34\}/);
  assert.match(loop,/solution-edge/);
  assert.doesNotMatch(loop,/solutionStep\(/);
});
