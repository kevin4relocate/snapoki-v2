import test from 'node:test';
import assert from 'node:assert/strict';
import {generateColorConnect} from '../src/js/games/color-connect-v8.js';

for(const difficulty of ['easy','medium','hard']){
  test(`Color Connect V8 diagnostic ${difficulty}`,()=>{
    for(const seed of ['v8-a','v8-b','quality-a']){
      const p=generateColorConnect(difficulty,seed),s=p.quality.solver;
      console.log('COLOR_V8',JSON.stringify({difficulty,seed,size:p.size,colors:p.segments.length,blocked:p.blocked.length,cheap:Math.round(p.quality.cheapScore),valid:p.quality.tacticalValid,solver:{nodes:s.nodes,backtracks:s.backtracks,deadEnds:s.deadEnds,decisions:s.decisions,greedyTraps:s.greedyTraps,solutions:s.solutions,unique:s.uniqueModel,tempting:s.temptingRoutes,victims:s.shortcutVictimPairs,multi:s.multiVictimTemptations,variants:s.variantTotal,score:s.score}}));
      assert.equal(p.quality.tacticalValid,true);
    }
  });
}
