import {DIFFICULTY_REWARDS} from '../../src/js/games-config.js';

export function rewardMultiplier(difficulty){return DIFFICULTY_REWARDS[difficulty]||1;}

const MIN_RANKED_MS={
  maze:{easy:1800,medium:4200,hard:8000},
  'number-path':{easy:2200,medium:6500,hard:12000},
  'color-connect':{easy:2400,medium:7000,hard:12500},
  'lights-out':{easy:1100,medium:2800,hard:4800},
  'loop-puzzle':{easy:2600,medium:6500,hard:12000}
};

export function anomalyAssessment({game,difficulty,timeMs,score,recentHourlyFinishes=0}){
  const floor=MIN_RANKED_MS[game]?.[difficulty]||1000;
  const time=Math.max(0,Number(timeMs)||0),recent=Math.max(0,Number(recentHourlyFinishes)||0),numericScore=Math.max(0,Number(score)||0);
  let risk=0;
  const reasons=[];
  if(time<floor){risk+=75;reasons.push('impossible_speed');}
  if(recent>=60){risk+=45;reasons.push('extreme_hourly_volume');}
  if(numericScore>=4950&&time<floor*1.7){risk+=20;reasons.push('near_perfect_speed');}
  return{risk,reasons,suspicious:risk>=70,minExpectedMs:floor};
}

export function crossedMilestone(beforePosition,afterPosition){
  const before=Number(beforePosition)||Infinity,after=Number(afterPosition)||Infinity,milestones=[1,3,10,25,50,100];
  return milestones.find(target=>after<=target&&before>target)||null;
}

export function chooseSmartNext({mode,difficulty,dailyCompleted=[],mastery={},nextTarget=null,bestScore=0,currentScore=0,rankAfter=null}){
  const levels=['easy','medium','hard'],labels={easy:'Easy',medium:'Medium',hard:'Hard'},done=new Set(dailyCompleted||[]);
  if(mode==='daily'&&done.size<3){
    const missing=levels.find(level=>!done.has(level));
    return{type:'daily',mode:'daily',difficulty:missing,label:`Finish Today’s ${labels[missing]} · ${done.size}/3 complete`};
  }
  if(nextTarget&&Number(nextTarget.points_to_pass)>0&&Number(nextTarget.points_to_pass)<=1500){
    return{type:'fresh',mode:'normal',difficulty,label:`Improve your PB · #${Math.max(1,Number(rankAfter||2)-1)} is next`};
  }
  const unmastered=levels.find(level=>!mastery?.[level]?.complete);
  if(unmastered)return{type:'difficulty',mode:'normal',difficulty:unmastered,label:`Try ${labels[unmastered]} ×${rewardMultiplier(unmastered)} · First Clear`};
  if(Number(bestScore)>Number(currentScore)&&Number(bestScore)>0)return{type:'fresh',mode:'normal',difficulty,label:`Beat your PB · ${Number(bestScore).toLocaleString()}`};
  return{type:'fresh',mode:'normal',difficulty,label:`New ${labels[difficulty]||'Puzzle'} · Chase a better PB`};
}
