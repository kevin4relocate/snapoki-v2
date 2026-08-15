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

test('Color Connect V8 Hard separates solver validity from weighted difficulty',()=>{
  for(const seed of ['v8-a','v8-b','quality-a']){
    const puzzle=generateColorConnect('hard',seed),q=colorConnectComplexity(puzzle),s=q.solver;
    assertCoverage(puzzle);
    assert.equal(puzzle.version,8);
    assert.equal(puzzle.size,12);
    assert.equal(puzzle.segments.length,11);
    assert.equal(puzzle.blocked.length,36);
    assert.equal(q.tacticalValid,true,'validity gate must pass');
    assert.equal(q.routeGraphComponents,1,'Hard routes must still form one competition graph');
    assert.ok(s.solutions>=1,'solver must find a full-cover solution');
    assert.equal(s.aborted,false,'solver validity may never rely on an aborted search');
    assert.equal(s.uniqueModel,true,'Hard candidate model remains unique');
    assert.equal(typeof q.difficultyScore,'number');
    assert.ok(q.difficultyScore>0&&q.difficultyScore<=100,'weighted difficulty must stay on the calibrated 0-100 scale');
    for(const key of ['backtracks','greedyTraps','deadEnds','decisions','temptingRoutes','shortcutVictims','synergy'])assert.equal(typeof q.difficultyBreakdown[key],'number');
  }
});

test('Color Connect V8 uses weighted selection without per-metric Hard rejection and stays deterministic',()=>{
  const src=read('src/js/games/color-connect-v8.js'),score=read('src/js/games/color-connect-v8-difficulty.js');
  for(const token of ['buildVariants','evaluateSolverModel','weightedGridPath','solverGate','colorConnectDifficultyScore','difficultyScore','cheapGate','shortlist'])assert.match(src,new RegExp(token));
  for(const token of ['cappedPoints','greedyTraps','backtracks','deadEnds','decisions','temptingRoutes','shortcutVictimPairs','synergy'])assert.match(score,new RegExp(token));
  assert.match(src,/hard:\{size:12,colors:11/,'production Hard must use eleven color pairs');
  assert.match(src,/maxCandidates:40/);
  assert.match(src,/shortlist:6/);
  assert.match(src,/nodeLimit:8000/);
  const gate=src.slice(src.indexOf('function solverGate'),src.indexOf('export function colorConnectComplexity'));
  assert.doesNotMatch(gate,/greedyTraps\s*>?=|backtracks\s*>?=|deadEnds\s*>?=|decisions\s*>?=|temptingRoutes\s*>?=|shortcutVictimPairs\s*>?=/,'difficulty proxies must not be binary validity conditions');
  const a=generateColorConnect('hard','v8-deterministic'),b=generateColorConnect('hard','v8-deterministic');
  assert.deepEqual(a,b);
});
