import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('diagnostic Color V7 ungated representative metrics',async()=>{
  const sourcePath=path.join(root,'src/js/games/color-connect.js');
  const tempPath=path.join(root,'src/js/games/__color-v7-diagnostic.mjs');
  const source=fs.readFileSync(sourcePath,'utf8')
    .replace(/function qualityGate\(difficulty,q\)\{[^\n]*\}/,"function qualityGate(){return true;}")
    .replace(/targetValid:3/g,'targetValid:1')
    .replace(/candidates:36,maxCandidates:64/g,'candidates:12,maxCandidates:12')
    .replace(/candidates:48,maxCandidates:96/g,'candidates:16,maxCandidates:16');
  fs.writeFileSync(tempPath,source);
  try{
    const {generateColorConnect,colorConnectComplexity}=await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
    for(const difficulty of ['medium','hard'])for(const seed of ['v7-a','v7-b','quality-a','cc-hard',`deterministic-${difficulty}`]){
      const p=generateColorConnect(difficulty,seed),q=colorConnectComplexity(p);
      console.log('COLOR_V7_DIAG',JSON.stringify({difficulty,seed,blocks:{quadrants:q.blocks.quadrants,rowSpread:q.blocks.rowSpread,colSpread:q.blocks.colSpread,isolated:q.blocks.isolated,largest:q.blocks.largestCluster,clusters:q.clusters.clusterCount,major:q.clusters.majorClusters,kinds:q.clusters.sizeKinds},route:{straight:q.straightRoutes,low:q.lowTurnRoutes,turns:q.avgTurns,detour:q.avgDetour,interference:q.interferencePairs,competitive:q.competitiveRoutes,minNeighbors:q.minNeighborColors,components:q.routeGraphComponents},space:{mixed:q.mixedZones,hot:q.hotZones,routeZones:q.avgRouteZones,overlap:q.boxOverlapPairs,intrusions:q.endpointBoxIntrusions,near:q.endpointNearPairs},shortcuts:{tempting:q.temptingRoutes,victims:q.shortcutVictimPairs,traps:q.trapRoutes},score:q.score}));
    }
  }finally{fs.rmSync(tempPath,{force:true});}
});
