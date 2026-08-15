import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateColorConnect,colorConnectComplexity} from '../src/js/games/color-connect.js';
import {areAdjacent} from '../src/js/games/utils.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

function assertCoverage(puzzle){
  const cells=puzzle.segments.flatMap(segment=>segment.path);
  assert.equal(new Set(cells).size,cells.length);
  assert.equal(cells.length+puzzle.blocked.length,puzzle.size*puzzle.size);
  for(const segment of puzzle.segments)for(let i=1;i<segment.path.length;i++)assert.ok(areAdjacent(segment.path[i-1],segment.path[i],puzzle.size));
}

test('Number Path Solution V2 uses one continuous ghost route instead of step badges on every cell',()=>{
  const src=read('src/js/games/number-path.js');
  assert.match(src,/number-solution-guide/);
  assert.match(src,/drawSolutionGuide/);
  assert.match(src,/routePoints/);
  assert.match(src,/solution-focus/);
  assert.doesNotMatch(src,/badge\.className='solution-step-badge'/);
  assert.match(src,/solutionStep\(delta=0\)/,'ordered step navigation remains available');
});

test('Color Connect V8 Hard is solver-verified instead of only visually complex',()=>{
  for(const seed of ['v8-a','v8-b','quality-a']){
    const puzzle=generateColorConnect('hard',seed),q=colorConnectComplexity(puzzle),s=q.solver;
    assertCoverage(puzzle);
    assert.equal(puzzle.version,8);
    assert.equal(puzzle.size,12);
    assert.equal(puzzle.segments.length,10);
    assert.equal(puzzle.blocked.length,36);
    assert.equal(q.tacticalValid,true);
    assert.equal(q.routeGraphComponents,1,'Hard routes must still form one competition graph');
    assert.equal(s.uniqueModel,true,'solver candidate model should have one full-cover solution');
    assert.ok(s.decisions>=9,'Hard needs many solver decisions');
    assert.ok(s.backtracks>=10,'Hard must force real backtracking');
    assert.ok(s.deadEnds>=8,'Hard must expose dead-end route choices');
    assert.ok(s.greedyTraps>=8,'short-looking routes should repeatedly fail');
    assert.ok(s.temptingRoutes>=2,'Hard should contain multiple tempting shortcuts');
    assert.ok(s.shortcutVictimPairs>=2,'greedy shortcuts must steal foreign route territory');
  }
});

test('Color Connect V8 uses explicit two-stage solver-first generation and stays deterministic',()=>{
  const src=read('src/js/games/color-connect-v8.js');
  for(const token of ['buildVariants','evaluateSolverModel','weightedGridPath','solverGate','greedyTraps','backtracks','deadEnds','uniqueModel','cheapGate','shortlist'])assert.match(src,new RegExp(token));
  const a=generateColorConnect('hard','v8-deterministic'),b=generateColorConnect('hard','v8-deterministic');
  assert.deepEqual(a,b);
});
