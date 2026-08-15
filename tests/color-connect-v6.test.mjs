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
    assert.ok(q.straightRoutes<=1,'Medium cannot be dominated by trivial straight routes');
    assert.ok(q.avgTurns>=2.4,'Medium routes should visibly bend');
    assert.ok(q.interferencePairs>=6,'Medium colors should share neighboring space');
    assert.ok(q.competitiveRoutes>=5,'Almost every Medium color should interact with other routes');
    assert.equal(q.routeGraphComponents,1,'Medium color territories should form one interaction graph');
    assert.ok(q.mixedZones>=5,'Medium should mix colors across most board zones');
    assert.ok(q.avgRouteZones>=2.5,'Medium routes should span several local zones');
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
    assert.ok(blocks.rowSpread>=8&&blocks.colSpread>=8,'Hard blockers must be spatially scattered');
    assert.ok(blocks.isolated>=1,'Hard keeps at least one isolated surprise blocker');
    assert.ok(q.clusters.clusterCount>=6,'Hard needs many blocker regions');
    assert.ok(q.clusters.sizeKinds>=3,'Hard should mix blocker shape scales');
    assert.ok(blocks.largestCluster<=10,'Hard cannot collapse into one dominant blocker island');
    assert.ok(q.straightRoutes<=1,'At most one color may have a simple route');
    assert.ok(q.avgTurns>=2.3,'Hard routes should remain winding overall');
    assert.ok(q.avgDetour>=2.2,'Hard routes must deviate from direct endpoint connections');
    assert.ok(q.interferencePairs>=8,'Hard needs many neighboring color-route pairs');
    assert.ok(q.competitiveRoutes>=5,'Most Hard colors should compete for space');
    assert.equal(q.routeGraphComponents,1,'all Hard colors must belong to one competition graph');
    assert.ok(q.minNeighborColors>=1,'no Hard color may be completely isolated');
    assert.ok(q.mixedZones>=7,'Hard colors must mix through most spatial zones');
    assert.ok(q.hotZones>=4,'multiple Hard zones must contain three or more color territories');
    assert.ok(q.avgRouteZones>=2.5,'Hard routes should span roughly three board zones each');
    assert.ok(q.boxOverlapPairs>=5,'route territories must overlap rather than form independent lanes');
    assert.ok(q.endpointBoxIntrusions>=4,'foreign endpoints must sit inside other route territories');
    assert.ok(q.endpointNearPairs>=10,'Hard endpoints should be strongly interleaved');
    assert.ok(q.temptingRoutes>=1,'selected Hard boards should expose at least one tempting shortcut');
    assert.ok(q.shortcutVictimPairs>=1,'a tempting shortcut must steal territory from another color');
  }
  assert.ok(average(hard.map(q=>q.mixedZones))>=7.5,'Hard should mix colors throughout nearly the whole board');
});

test('Color Connect V7 remains deterministic for ranked proof regeneration',()=>{
  for(const difficulty of ['easy','medium','hard']){
    const a=generateColorConnect(difficulty,`deterministic-${difficulty}`),b=generateColorConnect(difficulty,`deterministic-${difficulty}`);
    assert.deepEqual(a,b);
  }
});
