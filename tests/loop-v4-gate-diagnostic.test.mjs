import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Loop V4 ungated shape and clue diagnostics',async()=>{
  const sourcePath=path.join(root,'src/js/games/loop-puzzle-v4.js'),tempPath=path.join(root,'src/js/games/__loop-v4-gate-diag.mjs');
  let source=fs.readFileSync(sourcePath,'utf8');
  source=source.replace("if(!shapeGate(difficulty,shape,cfg.size)||shape.score<cfg.shapeMin)continue;",'');
  source=source.replace("if(!clueQ.valid)continue;",'');
  fs.writeFileSync(tempPath,source);
  try{
    const {generateLoopPuzzle}=await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
    for(const difficulty of ['medium','hard'])for(const seed of ['loop-v4-a','loop-v4-b','quality-a','quality-b','quality-c']){
      const p=generateLoopPuzzle(difficulty,seed),q=p.quality;
      console.log('LOOP_V4_UNGATED',JSON.stringify({difficulty,seed,clues:p.clues.length,score:+q.score.toFixed(1),shape:{turns:q.shape.turns,longest:q.shape.longestStraight,perimeter:+q.shape.perimeterRatio.toFixed(2),interior:+q.shape.interiorRatio.toFixed(2),reEntries:q.shape.reEntries,score:+q.shape.score.toFixed(1)},cluesQ:q.clues,solver:{nodes:q.solver.nodes,backtracks:q.solver.backtracks,deadEnds:q.solver.deadEnds,decisions:q.solver.decisions,aborted:q.solver.aborted,score:q.solver.score},necessity:{avg:+q.necessity.average.toFixed(2),weak:q.necessity.weak}}));
    }
  }finally{fs.rmSync(tempPath,{force:true});}
});
