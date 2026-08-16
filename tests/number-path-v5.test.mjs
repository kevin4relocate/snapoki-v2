import test from 'node:test';
import assert from 'node:assert/strict';
import {generateNumberPath,numberPathComplexity} from '../src/js/games/number-path.js';
import {blockedLayoutStats,areAdjacent} from '../src/js/games/utils.js';

const seeds=['v5-a','v5-b','v5-c','v5-d','v5-e','v5-f'];
const average=values=>values.reduce((a,b)=>a+b,0)/values.length;

function verifyRoute(puzzle){
  assert.equal(new Set(puzzle.solution).size,puzzle.openCount);
  assert.equal(puzzle.openCount+puzzle.blocked.length,puzzle.size*puzzle.size);
  for(let i=1;i<puzzle.solution.length;i++)assert.ok(areAdjacent(puzzle.solution[i-1],puzzle.solution[i],puzzle.size));
  for(const clue of puzzle.clues)assert.equal(puzzle.solution[clue.label-1],clue.index);
}

test('Number Path V5.1 Easy stays approachable but rejects straight sweep routes',()=>{
  const boards=seeds.map(seed=>generateNumberPath('easy',seed));
  for(const puzzle of boards){
    verifyRoute(puzzle);
    const q=numberPathComplexity(puzzle);
    assert.equal(puzzle.size,6);
    assert.equal(puzzle.blocked.length,0);
    assert.equal(q.routeValid,true);
    assert.ok(q.turns>=12,'Easy should include enough bends to avoid simple column sweeps');
    assert.ok(q.longestStraight<=4,'Easy should not contain full-height straight highways');
    assert.ok(q.shortRuns>=7,'Easy should contain several short direction changes');
    assert.ok(q.avgStraight<=3.1,'Easy should remain visibly winding without becoming Medium');
  }
});

test('Number Path V5 Medium uses scattered blocker shapes to force frequent detours',()=>{
  const boards=seeds.map(seed=>generateNumberPath('medium',seed));
  for(const puzzle of boards){
    verifyRoute(puzzle);
    const q=numberPathComplexity(puzzle),blocks=blockedLayoutStats(puzzle.blocked,puzzle.size);
    assert.equal(puzzle.size,8);
    assert.equal(puzzle.blocked.length,14);
    assert.equal(q.tacticalValid,true);
    assert.ok(q.turns>=22,'Medium route should turn frequently');
    assert.ok(q.longestStraight<=6,'Medium should reject long free straight lanes');
    assert.ok(q.blockerTurns>=17,'Medium blockers should sit beside many route turns');
    assert.ok(blocks.isolated>=3,'Medium should mix isolated blockers into the layout');
    assert.ok(q.clusters.clusterCount>=6,'Medium should spread blockers across many regions');
    assert.ok(q.clusters.majorClusters>=2,'Medium should include multiple small blocker groups');
    assert.ok(q.clusters.tacticalGroups>=2,'Medium should include several 2–6 cell blocker shapes');
  }
});

test('Number Path V5 Hard is winding, blocker-driven and visually non-linear',()=>{
  const boards=seeds.map(seed=>generateNumberPath('hard',seed));
  for(const puzzle of boards){
    verifyRoute(puzzle);
    const q=numberPathComplexity(puzzle),blocks=blockedLayoutStats(puzzle.blocked,puzzle.size);
    assert.equal(puzzle.size,10);
    assert.equal(puzzle.blocked.length,34);
    assert.equal(q.tacticalValid,true);
    assert.ok(q.turns>=36,'Hard needs a highly winding verified route');
    assert.ok(q.longestStraight<=6,'Hard cannot contain long straight solution highways');
    assert.ok(q.blockerTurns>=30,'Hard blockers must repeatedly force changes of direction');
    assert.equal(blocks.quadrants,4,'Hard blockers should pressure every quadrant');
    assert.ok(blocks.isolated>=4,'Hard should mix several isolated surprise blockers');
    assert.ok(q.clusters.clusterCount>=8,'Hard blockers should be distributed rather than one mass');
    assert.ok(q.clusters.majorClusters>=3,'Hard should contain several meaningful blocker groups');
    assert.ok(q.clusters.tacticalGroups>=3,'Hard should mix multiple compact blocker shapes');
  }
  assert.ok(average(boards.map(p=>numberPathComplexity(p).turns))>=40,'Hard should average at least forty turns across representative seeds');
});

test('Number Path V5 remains deterministic for ranked proof regeneration',()=>{
  for(const difficulty of ['easy','medium','hard']){
    const a=generateNumberPath(difficulty,`deterministic-${difficulty}`),b=generateNumberPath(difficulty,`deterministic-${difficulty}`);
    assert.deepEqual(a,b);
  }
});
