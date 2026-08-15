import test from 'node:test';
import assert from 'node:assert/strict';
import {generateColorConnect,colorConnectComplexity} from '../src/js/games/color-connect.js';
import {areAdjacent,blockedLayoutStats} from '../src/js/games/utils.js';

const seeds=['v6-a','v6-b','v6-c','v6-d','v6-e','v6-f'];
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

test('Color Connect V6 Medium scatters small blocker shapes across the board',()=>{
  for(const seed of seeds){
    const puzzle=generateColorConnect('medium',seed),q=colorConnectComplexity(puzzle),blocks=blockedLayoutStats(puzzle.blocked,puzzle.size);
    assertCoverage(puzzle);
    assert.equal(puzzle.size,8);
    assert.equal(puzzle.blocked.length,12);
    assert.equal(q.tacticalValid,true);
    assert.equal(blocks.quadrants,4,'Medium blockers should reach all board quadrants');
    assert.ok(blocks.isolated>=2,'Medium needs isolated surprise blockers');
    assert.ok(q.clusters.clusterCount>=5,'Medium needs many separated blocker regions');
    assert.ok(q.clusters.majorClusters>=2,'Medium should mix small clusters with isolated cells');
    assert.ok(q.clusters.sizeKinds>=3,'Medium should mix singles, pairs and larger shapes');
    assert.ok(blocks.largestCluster<=5,'Medium cannot collapse into one blocker mass');
    assert.equal(q.straightRoutes,0,'Medium may not contain trivial straight solution routes');
    assert.ok(q.avgTurns>=3,'Medium routes should visibly bend');
    assert.ok(q.turnsNearBlockers>=3,'Medium blockers should force route turns');
    assert.ok(q.interferencePairs>=6,'Medium colors should compete for neighboring space');
    assert.ok(q.competitiveRoutes>=5,'Almost every Medium color must interact with other routes');
  }
});

test('Color Connect V6 Hard creates bottlenecks and route competition instead of one blocker island',()=>{
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
    assert.ok(blocks.isolated>=2,'Hard needs multiple isolated tactical blockers');
    assert.ok(q.clusters.clusterCount>=6,'Hard needs at least six blocker regions');
    assert.ok(q.clusters.majorClusters>=4,'Hard should have several meaningful blocker shapes');
    assert.ok(blocks.largestCluster<=9,'Hard cannot collapse into a single dominant blocker island');
    assert.equal(q.straightRoutes,0,'Hard cannot contain straight solution routes');
    assert.ok(q.lowTurnRoutes<=2,'Nearly every Hard route must require several bends');
    assert.ok(q.avgTurns>=3.8,'Hard routes should be strongly winding');
    assert.ok(q.interferencePairs>=9,'Hard needs many neighboring color-route pairs');
    assert.ok(q.competitiveRoutes>=7,'Almost every Hard color should compete for space');
    assert.ok(q.avgNeighborColors>=2,'Hard routes should border multiple other colors on average');
    assert.ok(q.turnsNearBlockers>=7,'Hard blockers must actively force turns');
    assert.ok(q.bottleneckTurns>=2,'Hard needs blocker-forced bottleneck turns');
    assert.ok(q.narrowCells>=15,'Hard needs meaningful corridor pressure');
    assert.ok(q.blockElbows>=4,'Hard blocker regions should include non-linear shapes');
  }
  assert.ok(average(hard.map(q=>q.avgTurns))>=4,'Hard should average about four or more turns per route');
});

test('Color Connect V6 remains deterministic for ranked proof regeneration',()=>{
  for(const difficulty of ['easy','medium','hard']){
    const a=generateColorConnect(difficulty,`deterministic-${difficulty}`),b=generateColorConnect(difficulty,`deterministic-${difficulty}`);
    assert.deepEqual(a,b);
  }
});
