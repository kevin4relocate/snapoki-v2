export const DAILY_COMPLETE_BONUS=250;

const FARM_STEPS={
  easy:[1,.90,.75,.60],
  medium:[1,.96,.88,.78],
  hard:[1,.99,.96,.92]
};

export function regularFarmMultiplier(difficulty,priorFinishesToday=0){
  const steps=FARM_STEPS[difficulty]||FARM_STEPS.easy,count=Math.max(0,Number(priorFinishesToday)||0);
  if(count===0)return steps[0];
  if(count<=2)return steps[1];
  if(count<=5)return steps[2];
  return steps[3];
}

export function adjustedRegularPoints(basePoints,difficulty,priorFinishesToday=0){
  return Math.max(5,Math.round(Math.max(0,Number(basePoints)||0)*regularFarmMultiplier(difficulty,priorFinishesToday)));
}

const MIN_RANKED_MS={
  maze:{easy:1800,medium:2600,hard:3600},
  'number-path':{easy:2200,medium:3200,hard:4500},
  'color-connect':{easy:2400,medium:3600,hard:5200},
  'lights-out':{easy:1100,medium:1700,hard:2400},
  'loop-puzzle':{easy:2600,medium:4200,hard:6200}
};

export function anomalyAssessment({game,difficulty,timeMs,score,recentHourlyFinishes=0}){
  const floor=MIN_RANKED_MS[game]?.[difficulty]||1000,time=Math.max(0,Number(timeMs)||0),recent=Math.max(0,Number(recentHourlyFinishes)||0),numericScore=Math.max(0,Number(score)||0);let risk=0;const reasons=[];
  if(time<floor){risk+=75;reasons.push('impossible_speed');}
  if(recent>=60){risk+=45;reasons.push('extreme_hourly_volume');}
  if(numericScore>=4950&&time<floor*1.8){risk+=20;reasons.push('near_perfect_speed');}
  return{risk,reasons,suspicious:risk>=70,minExpectedMs:floor};
}

export function crossedMilestone(beforePosition,afterPosition){
  const before=Number(beforePosition)||Infinity,after=Number(afterPosition)||Infinity;
  const milestones=[1,3,10,25,50,100];
  return milestones.find(target=>after<=target&&before>target)||null;
}

export function chooseSmartNext({mode,difficulty,dailyCompleted=[],mastery={},nextTarget=null,bestScore=0,currentScore=0,rankAfter=null}){
  const levels=['easy','medium','hard'],labels={easy:'Easy',medium:'Medium',hard:'Hard'},done=new Set(dailyCompleted||[]);
  if(mode==='daily'&&done.size<3){const missing=levels.find(level=>!done.has(level));return{type:'daily',mode:'daily',difficulty:missing,label:`Finish Today’s ${labels[missing]} · ${done.size}/3 complete`};}
  if(nextTarget&&Number(nextTarget.points_to_pass)>0&&Number(nextTarget.points_to_pass)<=320){return{type:'fresh',mode,difficulty,label:`+${Number(nextTarget.points_to_pass).toLocaleString()} pts to #${Math.max(1,Number(rankAfter||2)-1)} · Play Again`};}
  const unmastered=levels.find(level=>!mastery?.[level]?.complete);
  if(unmastered)return{type:'difficulty',mode:'normal',difficulty:unmastered,label:`Try ${labels[unmastered]} · First ${labels[unmastered]} Mastery`};
  if(Number(bestScore)>Number(currentScore)&&Number(bestScore)>0)return{type:'fresh',mode,difficulty,label:`Beat your PB · ${Number(bestScore).toLocaleString()}`};
  return{type:'fresh',mode,difficulty,label:'New Puzzle · Keep climbing'};
}
