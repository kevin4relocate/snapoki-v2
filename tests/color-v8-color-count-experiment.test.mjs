import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=path.join(root,'src/js/games/color-connect-v8.js');
const source=fs.readFileSync(sourcePath,'utf8');
const SEEDS=Array.from({length:24},(_,i)=>`color-v8-color-exp:hard:${String(i).padStart(3,'0')}`);
const palette="const COLORS=['#ff5d8f','#52d273','#5ca8ff','#ffb347','#b879ff','#39d0d8','#ff7c54','#e7e25a','#8b9cff','#f0a3ff','#9be564','#f7f7f2'];\nconst NAMES=['pink','green','blue','orange','purple','cyan','coral','yellow','indigo','orchid','lime','ivory'];";

function percentile(values,p){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*p,lo=Math.floor(index),hi=Math.ceil(index);return lo===hi?sorted[lo]:sorted[lo]+(sorted[hi]-sorted[lo])*(index-lo);}
const avg=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const r=value=>Math.round(value*10)/10;

async function loadVariant(colors){
  const tempPath=path.join(root,`src/js/games/__color-v8-${colors}-experiment.mjs`);
  let variant=source
    .replace(/hard:\{size:12,colors:10,/,`hard:{size:12,colors:${colors},`)
    .replace(/const COLORS=\[[^\n]+\];\nconst NAMES=\[[^\n]+\];/,palette);
  fs.writeFileSync(tempPath,variant);
  const module=await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}-${colors}`);
  return{module,tempPath};
}

for(const colors of [10,11,12]){
  test(`Color Connect V8 Hard ${colors}-color experiment`,async()=>{
    const {module,tempPath}=await loadVariant(colors),rows=[];let failures=0;
    try{
      for(const seed of SEEDS){
        const started=performance.now();
        try{
          const puzzle=module.generateColorConnect('hard',seed),elapsed=performance.now()-started,s=puzzle.quality.solver,lengths=puzzle.segments.map(segment=>segment.path.length);
          rows.push({score:puzzle.quality.difficultyScore,backtracks:s.backtracks,deadEnds:s.deadEnds,decisions:s.decisions,greedyTraps:s.greedyTraps,temptingRoutes:s.temptingRoutes,shortcutVictims:s.shortcutVictimPairs,time:elapsed,avgRoute:avg(lengths),minRoute:Math.min(...lengths),maxRoute:Math.max(...lengths)});
          assert.equal(puzzle.size,12);assert.equal(puzzle.segments.length,colors);assert.equal(puzzle.blocked.length,36);assert.equal(puzzle.quality.tacticalValid,true);
        }catch(error){failures++;console.log('COLOR_COUNT_FAILURE',JSON.stringify({colors,seed,message:error.message}));}
      }
      assert.ok(rows.length>=18,`${colors} colors should generate enough valid samples`);
      const summary={
        colors,samples:SEEDS.length,valid:rows.length,failures,
        difficulty:{mean:r(avg(rows.map(x=>x.score))),p50:r(percentile(rows.map(x=>x.score),.5)),p75:r(percentile(rows.map(x=>x.score),.75)),p90:r(percentile(rows.map(x=>x.score),.9)),max:r(Math.max(...rows.map(x=>x.score)))},
        solver:{backtracks:r(avg(rows.map(x=>x.backtracks))),deadEnds:r(avg(rows.map(x=>x.deadEnds))),decisions:r(avg(rows.map(x=>x.decisions))),greedyTraps:r(avg(rows.map(x=>x.greedyTraps))),temptingRoutes:r(avg(rows.map(x=>x.temptingRoutes))),shortcutVictims:r(avg(rows.map(x=>x.shortcutVictims)))},
        routes:{averageLength:r(avg(rows.map(x=>x.avgRoute))),averageMinLength:r(avg(rows.map(x=>x.minRoute))),averageMaxLength:r(avg(rows.map(x=>x.maxRoute)))},
        generationMs:{mean:r(avg(rows.map(x=>x.time)),p50:r(percentile(rows.map(x=>x.time),.5)),p90:r(percentile(rows.map(x=>x.time),.9))}
      };
      console.log('COLOR_COUNT_SUMMARY',JSON.stringify(summary));
    }finally{fs.rmSync(tempPath,{force:true});}
  });
}
