import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {colorConnectDifficultyScore,colorConnectSolverInvariant,COLOR_V8_SCORE_MODEL} from '../src/js/games/color-connect-v8-difficulty.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function percentile(values,p){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b),position=(sorted.length-1)*p,base=Math.floor(position),rest=position-base;
  const value=sorted[base]+(sorted[base+1]!=null?(sorted[base+1]-sorted[base])*rest:0);
  return Math.round(value*10)/10;
}

function stats(values){
  if(!values.length)return{count:0,min:null,p10:null,p25:null,p50:null,p75:null,p90:null,p95:null,max:null,mean:null};
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  return{count:values.length,min:Math.min(...values),p10:percentile(values,.10),p25:percentile(values,.25),p50:percentile(values,.50),p75:percentile(values,.75),p90:percentile(values,.90),p95:percentile(values,.95),max:Math.max(...values),mean:Math.round(mean*10)/10};
}

function scoreBands(values){
  const bands=[['<50',0,50],['50-59',50,60],['60-69',60,70],['70-79',70,80],['80-89',80,90],['90+',90,101]];
  return Object.fromEntries(bands.map(([label,min,max])=>[label,values.filter(value=>value>=min&&value<max).length]));
}

function cutoffRates(values){
  return Object.fromEntries([70,75,80,85,90].map(cutoff=>[String(cutoff),values.length?Math.round(values.filter(value=>value>=cutoff).length/values.length*1000)/10:0]));
}

function compactRow(row){return{seed:row.seed,score:row.score,greedyTraps:row.greedyTraps,backtracks:row.backtracks,deadEnds:row.deadEnds,decisions:row.decisions,temptingRoutes:row.temptingRoutes,shortcutVictimPairs:row.shortcutVictimPairs};}

function reviewSamples(rows){
  const bands=[['75-80',75,80,77.5],['80-85',80,85,82.5],['85-90',85,90,87.5],['90+',90,101,93]];
  return Object.fromEntries(bands.map(([label,min,max,target])=>{
    const candidates=rows.filter(row=>row.score>=min&&row.score<max).sort((a,b)=>Math.abs(a.score-target)-Math.abs(b.score-target)||b.greedyTraps-a.greedyTraps||b.backtracks-a.backtracks);
    return[label,candidates.slice(0,3).map(compactRow)];
  }));
}

async function loadInternals(){
  const sourcePath=path.join(root,'src/js/games/color-connect-v8.js'),tempPath=path.join(root,'src/js/games/__color-v8-calibration.mjs');
  const source=fs.readFileSync(sourcePath,'utf8')+'\nexport {LEVEL,candidateFor,evaluateSolverModel};\n';
  fs.writeFileSync(tempPath,source);
  try{return await import(`${pathToFileURL(tempPath).href}?cal=${Date.now()}`);}finally{fs.rmSync(tempPath,{force:true});}
}

async function collectDifficulty(engine,difficulty,count,prefix){
  const cfg=engine.LEVEL[difficulty],selected=[],allFinalists=[];let topologyRejects=0,solverRejects=0;
  const started=performance.now();
  for(let n=0;n<count;n++){
    const seed=`${prefix}:${difficulty}:${String(n).padStart(4,'0')}`,cheap=[];
    for(let i=0;i<cfg.maxCandidates;i++){
      const candidate=engine.candidateFor(cfg,seed,i,difficulty);
      if(candidate?.quality.cheapValid)cheap.push(candidate);
      if(i+1>=cfg.candidates&&cheap.length>=cfg.shortlist)break;
    }
    if(!cheap.length){topologyRejects++;continue;}
    cheap.sort((a,b)=>b.quality.cheapScore-a.quality.cheapScore);
    const finalists=cheap.slice(0,cfg.shortlist),valid=[];
    for(let i=0;i<finalists.length;i++){
      const candidate=finalists[i],solver=engine.evaluateSolverModel({...candidate,size:cfg.size},cfg,`${seed}:solver:${i}`),weighted=colorConnectDifficultyScore(solver);
      const row={seed,candidate:i,score:weighted.total,breakdown:weighted.breakdown,nodes:solver.nodes,backtracks:solver.backtracks,deadEnds:solver.deadEnds,decisions:solver.decisions,greedyTraps:solver.greedyTraps,temptingRoutes:solver.temptingRoutes,shortcutVictimPairs:solver.shortcutVictimPairs,multiVictimTemptations:solver.multiVictimTemptations,solutions:solver.solutions,uniqueModel:solver.uniqueModel,aborted:solver.aborted,cheapScore:Math.round(candidate.quality.cheapScore)};
      allFinalists.push(row);
      if(colorConnectSolverInvariant(solver))valid.push(row);
    }
    if(!valid.length){solverRejects++;continue;}
    valid.sort((a,b)=>b.score-a.score||b.greedyTraps-a.greedyTraps||b.backtracks-a.backtracks||b.cheapScore-a.cheapScore);
    selected.push(valid[0]);
  }
  return{difficulty,requested:count,selected,allFinalists,topologyRejects,solverRejects,durationMs:Math.round(performance.now()-started)};
}

function summarize(group){
  const rows=group.selected,field=name=>rows.map(row=>row[name]),scores=field('score');
  return{
    requested:group.requested,
    selected:rows.length,
    topologyRejects:group.topologyRejects,
    solverRejects:group.solverRejects,
    selectionRatePct:Math.round(rows.length/group.requested*1000)/10,
    durationMs:group.durationMs,
    score:stats(scores),
    bands:scoreBands(scores),
    referenceCutoffPassPct:cutoffRates(scores),
    metrics:{
      backtracks:stats(field('backtracks')),
      greedyTraps:stats(field('greedyTraps')),
      deadEnds:stats(field('deadEnds')),
      decisions:stats(field('decisions')),
      temptingRoutes:stats(field('temptingRoutes')),
      shortcutVictimPairs:stats(field('shortcutVictimPairs')),
      nodes:stats(field('nodes'))
    },
    uniqueModelPct:rows.length?Math.round(rows.filter(row=>row.uniqueModel).length/rows.length*1000)/10:0,
    reviewSamples:reviewSamples(rows),
    top5:[...rows].sort((a,b)=>b.score-a.score).slice(0,5).map(compactRow),
    bottom5:[...rows].sort((a,b)=>a.score-b.score).slice(0,5).map(compactRow)
  };
}

export async function runColorV8Calibration({medium=60,hard=100,prefix='color-v8-calibration-b1',outDir=null}={}){
  const engine=await loadInternals(),mediumGroup=await collectDifficulty(engine,'medium',medium,prefix),hardGroup=await collectDifficulty(engine,'hard',hard,prefix);
  const report={generatedAt:new Date().toISOString(),prefix,scoreModel:COLOR_V8_SCORE_MODEL,medium:summarize(mediumGroup),hard:summarize(hardGroup)};
  if(outDir){
    const target=path.resolve(root,outDir);fs.mkdirSync(target,{recursive:true});
    fs.writeFileSync(path.join(target,'summary.json'),JSON.stringify(report,null,2));
    const rows=[...mediumGroup.selected.map(row=>({difficulty:'medium',...row})),...hardGroup.selected.map(row=>({difficulty:'hard',...row}))],headers=['difficulty','seed','score','nodes','backtracks','deadEnds','decisions','greedyTraps','temptingRoutes','shortcutVictimPairs','multiVictimTemptations','solutions','uniqueModel','aborted','cheapScore'];
    const csv=[headers.join(','),...rows.map(row=>headers.map(key=>JSON.stringify(row[key]??'')).join(','))].join('\n');
    fs.writeFileSync(path.join(target,'selected.csv'),csv);
  }
  return report;
}

function readArg(name,fallback){const prefix=`--${name}=`;const arg=process.argv.find(value=>value.startsWith(prefix));return arg?Number(arg.slice(prefix.length)):fallback;}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const report=await runColorV8Calibration({medium:readArg('medium',60),hard:readArg('hard',100),prefix:process.env.COLOR_V8_PREFIX||'color-v8-calibration-b1',outDir:process.env.COLOR_V8_OUT||null});
  console.log(JSON.stringify(report,null,2));
}
