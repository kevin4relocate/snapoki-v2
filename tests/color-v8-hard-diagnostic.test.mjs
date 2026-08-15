import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('diagnostic Color Connect V8 ungated Hard metrics',async()=>{
  const sourcePath=path.join(root,'src/js/games/color-connect-v8.js'),tempPath=path.join(root,'src/js/games/__color-v8-hard-diag.mjs');
  const source=fs.readFileSync(sourcePath,'utf8').replace(/function solverGate\(difficulty,s\)\{[\s\S]*?\n\}/,"function solverGate(difficulty,s){return s.solutions>=1;}");
  fs.writeFileSync(tempPath,source);
  try{
    const {generateColorConnect}=await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
    for(const seed of ['v8-a','v8-b','quality-a','quality-b','cc-hard']){
      const p=generateColorConnect('hard',seed),s=p.quality.solver;
      console.log('COLOR_V8_HARD_DIAG',JSON.stringify({seed,size:p.size,blocked:p.blocked.length,cheap:Math.round(p.quality.cheapScore),solver:{nodes:s.nodes,backtracks:s.backtracks,deadEnds:s.deadEnds,decisions:s.decisions,greedyTraps:s.greedyTraps,solutions:s.solutions,unique:s.uniqueModel,aborted:s.aborted,tempting:s.temptingRoutes,victims:s.shortcutVictimPairs,multi:s.multiVictimTemptations,variants:s.variantTotal,minVariants:s.minVariants,score:s.score}}));
    }
  }finally{fs.rmSync(tempPath,{force:true});}
});
