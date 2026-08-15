const cappedPoints=(value,cap,maxPoints)=>Math.min(Math.max(0,value||0),cap)/cap*maxPoints;

export function colorConnectDifficultyScore(stats={}){
  const backtracks=cappedPoints(stats.backtracks,30,25);
  const greedyTraps=cappedPoints(stats.greedyTraps,10,30);
  const deadEnds=cappedPoints(stats.deadEnds,30,12);
  const decisions=cappedPoints(stats.decisions,16,15);
  const temptingRoutes=cappedPoints(stats.temptingRoutes,4,8);
  const shortcutVictims=cappedPoints(stats.shortcutVictimPairs,6,5);
  let synergy=0;
  if((stats.greedyTraps||0)>=6&&(stats.temptingRoutes||0)>=1&&(stats.shortcutVictimPairs||0)>=1)synergy+=3;
  if((stats.backtracks||0)>=15&&(stats.decisions||0)>=10)synergy+=2;
  const total=Math.min(100,backtracks+greedyTraps+deadEnds+decisions+temptingRoutes+shortcutVictims+synergy);
  return{
    total:Math.round(total*10)/10,
    breakdown:{
      backtracks:Math.round(backtracks*10)/10,
      greedyTraps:Math.round(greedyTraps*10)/10,
      deadEnds:Math.round(deadEnds*10)/10,
      decisions:Math.round(decisions*10)/10,
      temptingRoutes:Math.round(temptingRoutes*10)/10,
      shortcutVictims:Math.round(shortcutVictims*10)/10,
      synergy
    }
  };
}

export function colorConnectSolverInvariant(stats={}){
  return (stats.solutions||0)>=1&&!stats.aborted;
}

export const COLOR_V8_SCORE_MODEL={
  version:1,
  scale:100,
  caps:{backtracks:30,greedyTraps:10,deadEnds:30,decisions:16,temptingRoutes:4,shortcutVictimPairs:6},
  maxPoints:{backtracks:25,greedyTraps:30,deadEnds:12,decisions:15,temptingRoutes:8,shortcutVictimPairs:5,synergy:5},
  synergy:[
    {points:3,rule:'greedyTraps >= 6 && temptingRoutes >= 1 && shortcutVictimPairs >= 1'},
    {points:2,rule:'backtracks >= 15 && decisions >= 10'}
  ]
};
