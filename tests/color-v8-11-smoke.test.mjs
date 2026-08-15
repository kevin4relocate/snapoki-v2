import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {generateColorConnect} from '../src/js/games/color-connect.js';

const seeds=Array.from({length:32},(_,i)=>`color-v8-11-prod:h1:${String(i).padStart(3,'0')}`);
const avg=values=>values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length);
const round=value=>Math.round(value*10)/10;

test('diagnose production 11-color Hard distribution',()=>{
  const rows=[];let failures=0;
  for(const seed of seeds){
    const started=performance.now();
    try{
      const puzzle=generateColorConnect('hard',seed),solver=puzzle.quality.solver,row={seed,score:round(puzzle.quality.difficultyScore),backtracks:solver.backtracks,deadEnds:solver.deadEnds,decisions:solver.decisions,greedyTraps:solver.greedyTraps,temptingRoutes:solver.temptingRoutes,shortcutVictims:solver.shortcutVictimPairs,ms:round(performance.now()-started)};
      rows.push(row);console.log('COLOR11_ROW',JSON.stringify(row));
      assert.equal(puzzle.size,12);assert.equal(puzzle.segments.length,11);assert.equal(puzzle.blocked.length,36);assert.equal(puzzle.quality.tacticalValid,true);assert.equal(solver.uniqueModel,true);
    }catch(error){failures++;console.log('COLOR11_FAILURE',JSON.stringify({seed,message:error.message}));}
  }
  console.log('COLOR11_SUMMARY',JSON.stringify({samples:seeds.length,valid:rows.length,failures,scoreMean:round(avg(rows.map(row=>row.score))),backtracks:round(avg(rows.map(row=>row.backtracks))),deadEnds:round(avg(rows.map(row=>row.deadEnds))),decisions:round(avg(rows.map(row=>row.decisions))),greedyTraps:round(avg(rows.map(row=>row.greedyTraps))),generationMs:round(avg(rows.map(row=>row.ms)))}));
  assert.ok(rows.length>=24,'production 11-color config should generate a healthy majority of deterministic seeds');
});
