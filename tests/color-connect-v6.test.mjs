import test from 'node:test';
import assert from 'node:assert/strict';
import {generateColorConnect,colorConnectComplexity} from '../src/js/games/color-connect.js';
import {areAdjacent,blockedLayoutStats} from '../src/js/games/utils.js';

const seeds=['v7-a','v7-b','v7-c','v7-d','v7-e','v7-f'];
const average=values=>values.reduce((sum,value)=>sum+value,0)/values.length;

function assertCoverage(puzzle){
  const cells=puzzle.segments.flatMap(segment=>segment.path);
  assert.equal(new Set(cells).size,cells.length,'solution routes may not overlap');
  assert.equal(cells.length+puzzle.blocked.length,puzzle.size*puzzle.size,'routes plus blockers must cover the board');
  for(const segment of puzzle.segments){
    assert.ok(segment.path.length>=5);
    for(let i=1;i<segment.path.length;i++)assert.ok(areAdjacent(segment.path[i-1],segment.path[i],puzzle.size));
  }
}

test('Color Connect V7 Medium scatters blockers and mixes route territories',()=>{
  for(const seed of seeds){
    const puzzle=generateColorConnect('medium',seed),q=colorConnectComplexity(puzzle),blocks=blockedLayoutStats(puzzle.blocked,puzzle.size);
    assertCoverage(puzzle);
    assert.equal(puzzle.size,8);
    assert.equal(puzzle.blocked.length,12);
    assert.equal(q.tacticalValid,true);
    assert.equal(blocks.quadrants,4,'Medium blockers should reach all board quadrants');
    assert.ok(blocks.isolated>=2,'Medium needs isolated surprise blockers');
    assert.ok(q.clusters.clusterCount>=5,'Medium needs separated blocker regions');
    assert.ok(q.clusters.sizeKinds>=3,'Medium should mix singles, pairs and larger shapes');
    assert.ok(blocks.largestCluster<=5,'Medium cannot collapse into one blocker mass');
    assert.equal(q.straightRoutes,0,'Medium may not contain trivial straight solution routes');
    assert.ok(q.avgTurns>=3,'Medium routes should visibly bend');
    assert.equal(q.routeGraphComponents,1,'Medium color territories should form one interaction graph');
    assert.ok(q.mixedZones>=4,'Medium should mix colors across multiple board zones');
    assert.ok(q.avgRouteZones>=2,'Medium routes should span more than one local lane');
  }
});

test('Color Connect V7 Hard is topology-driven instead of separable lane-style',()=>{
  const hard=[];
  for(const seed of seeds){
    const puzzle=generateColorConnect('hard',seed),q=colorConnectComplexity(puzzle),blocks=blockedLayoutStats(puzzle.blocked,puzzle.size);
    hard.push(q);
    assertCoverage(puzzle);
    assert.equal(puzzle.size,10);
    assert.equal(puzzle.blocked.length,28);
    assert.equal(q.tacticalValid,true);
    assert.equal(blocks.quadrants,4,'Hard blockers must pressure the whole board');
    assert.ok(blocks.rowSpread>=7&&blocks.colSpread>=7,'Hard blockers must be spatially scattered');
    assert.ok(blocks.isolated>=2,'Hard needs isolated tactical blockers');
    assert.ok(q.clusters.clusterCount>=6,'Hard needs many blocker regions');
    assert.ok(q.clusters.sizeKinds>=3,'Hard should mix blocker shape scales');
    assert.ok(blocks.largestCluster<=9,'Hard cannot collapse into one dominant blocker island');
    assert.equal(q.straightRoutes,0,'Hard cannot contain straight solution routes');
    assert.ok(q.avgTurns>=3.4,'Hard routes should remain visibly winding');
    assert.ok(q.interferencePairs>=8,'Hard needs many neighboring color-route pairs');
    assert.ok(q.competitiveRoutes>=7,'Almost every Hard color should compete for space');
    assert.equal(q.routeGraphComponents,1,'all Hard colors must belong to one competition graph');
    assert.ok(q.minNeighborColors>=1,'no Hard color may be completely isolated');
    assert.ok(q.mixedZones>=4,'Hard routes must mix across the board');
    assert.ok(q.avgRouteZones>=2,'Hard routes should cross multiple spatial zones');
    assert.ok(q.boxOverlapPairs>=4,'route territories must overlap rather than form independent lanes');
    assert.ok(q.endpointBoxIntrusions>=2,'foreign endpoints should intrude into other route territories');
    assert.ok(q.endpointNearPairs>=2,'endpoint placement should create local competition');
  }
  assert.ok(average(hard.map(q=>q.avgTurns))>=3.6,'Hard should remain strongly winding on average');
  assert.ok(hard.reduce((sum,q)=>sum+q.temptingRoutes,0)>=1,'the selected Hard set should include tempting shortcut pressure');
});

test('Color Connect V7 remains deterministic for ranked proof regeneration',()=>{
  for(const difficulty of ['easy','medium','hard']){
    const a=generateColorConnect(difficulty,`deterministic-${difficulty}`),b=generateColorConnect(difficulty,`deterministic-${difficulty}`);
    assert.deepEqual(a,b);
  }
});
