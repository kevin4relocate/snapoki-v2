import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateLightsOut,pressLights} from '../src/js/games/lights-out.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/js/games/lights-out.js'),'utf8');

test('Lights Out V2 keeps a correct solution set stable after guided presses',()=>{
  for(const difficulty of ['easy','medium','hard']){
    const puzzle=generateLightsOut(difficulty,`lights-v2-${difficulty}`);
    let board=Uint8Array.from(puzzle.board);
    const remaining=[...puzzle.solution];
    const first=remaining.shift();
    board=pressLights(board,puzzle.size,first);
    for(const index of remaining)board=pressLights(board,puzzle.size,index);
    assert.equal([...board].some(Boolean),false);
  }
});

test('Lights Out V2 uses direct target hints and tactile effect previews',()=>{
  assert.match(source,/light-target-marker/);
  assert.match(source,/light-effect-preview/);
  assert.match(source,/hintEffects=new Set\(effectIndices\(next\)\)/);
  assert.match(source,/pointerover/);
  assert.match(source,/pointerdown/);
  assert.doesNotMatch(source,/focus on row/i);
  assert.doesNotMatch(source,/One press in this row/i);
});

test('Lights Out V2 removes guided targets without recomputing unless the player deviates',()=>{
  assert.match(source,/if\(guidedPress\)solutionSet\.delete\(index\)/);
  assert.match(source,/else lockSolution\(\)/);
  assert.match(source,/target\$\{solutionSet\.size===1\?'':'s'\} remaining/);
  assert.doesNotMatch(source,/Solution hidden\. This board remains practice-only/);
});
