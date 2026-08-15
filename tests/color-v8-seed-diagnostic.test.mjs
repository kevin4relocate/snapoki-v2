import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('diagnose rare V8 seed',async()=>{
  const sourcePath=path.join(root,'src/js/games/color-connect-v8.js'),tempPath=path.join(root,'src/js/games/__color-v8-seed-diag.mjs');
  const source=fs.readFileSync(sourcePath,'utf8').replace(/function solverGate\(difficulty,s\)\{[\s\S]*?\n\}/,"function solverGate(difficulty,s){return s.solutions>=1;}");
  fs.writeFileSync(tempPath,source);
  try{const {generateColorConnect}=await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);for(const seed of ['v8-deterministic','v8-deterministic:retry:1','v8-deterministic:retry:2']){const p=generateColorConnect('hard',seed),s=p.quality.solver;console.log('V8_RARE',JSON.stringify({seed,decisions:s.decisions,backtracks:s.backtracks,dead:s.deadEnds,greedy:s.greedyTraps,tempting:s.temptingRoutes,victims:s.shortcutVictimPairs,unique:s.uniqueModel,score:s.score}));}}finally{fs.rmSync(tempPath,{force:true});}
});
