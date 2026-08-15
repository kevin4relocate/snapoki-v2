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

test('Color Connect V7 Hard rejects separable lane-style boards',()=>{
  for(const seed of ['v7-a','v7-b','v7-c','v7-d']){
    const puzzle=generateColorConnect('hard',seed),q=colorConnectComplexity(puzzle);
    assertCoverage(puzzle);
    assert.equal(puzzle.size,10);
    assert.equal(puzzle.blocked.length,28);
    assert.equal(q.tacticalValid,true);
    assert.equal(q.routeGraphComponents,1,'all color routes must belong to one competition graph');
    assert.ok(q.minNeighborColors>=1,'no Hard color may live in a completely isolated lane');
    assert.ok(q.mixedZones>=7,'colors must mix across most spatial zones');
    assert.ok(q.hotZones>=4,'multiple zones must contain at least three color territories');
    assert.ok(q.avgRouteZones>=2.5,'routes must span multiple areas of the board');
    assert.ok(q.boxOverlapPairs>=5,'route territories must overlap instead of forming separate lanes');
    assert.ok(q.endpointBoxIntrusions>=4,'foreign endpoints must intrude into other route territories');
    assert.ok(q.endpointNearPairs>=10,'endpoints should be strongly interleaved rather than zoned by color');
    assert.ok(q.temptingRoutes>=1,'shortlist scoring should select a tempting shortcut');
    assert.ok(q.shortcutVictimPairs>=1,'that shortcut must consume another color territory');
  }
});

test('Color Connect V7 topology scoring is explicit deterministic and two-stage',()=>{
  const src=read('src/js/games/color-connect.js');
  for(const token of ['topologyProxy','spatialMixStats','shortcutPressure','routeGraphComponents','temptingRoutes','shortcutVictimPairs','includeShortcuts','shortlist','shortcutFinalists'])assert.match(src,new RegExp(token));
  const a=generateColorConnect('hard','v7-deterministic'),b=generateColorConnect('hard','v7-deterministic');
  assert.deepEqual(a,b);
});
