export const DAILY_BITS=Object.freeze({easy:1,medium:2,hard:4});
export const DAILY_COMPLETE_MASK=7;

export function dailyBit(difficulty){return DAILY_BITS[difficulty]||0;}

export function progressionXp({difficulty,score,hints=0}={}){
  const base={easy:30,medium:55,hard:90}[difficulty]||20;
  const quality=Math.max(0,Math.min(5000,Number(score)||0));
  const hintPenalty=Math.max(0,Number(hints)||0)*5;
  return Math.max(10,Math.round(base+quality/250-hintPenalty));
}

export function levelFromXp(xp=0){
  const value=Math.max(0,Number(xp)||0);
  return 1+Math.floor(Math.sqrt(value/180));
}

export function isBetterPerformance(candidate,current={}){
  const rankScore=Math.max(0,Number(candidate?.rankScore)||0);
  const score=Math.max(0,Number(candidate?.score)||0);
  const timeMs=Math.max(0,Number(candidate?.timeMs)||0);
  const currentRank=Math.max(0,Number(current?.rankScore)||0);
  const currentScore=Math.max(0,Number(current?.score)||0);
  const currentTime=Number.isFinite(Number(current?.timeMs))?Math.max(0,Number(current.timeMs)):Number.POSITIVE_INFINITY;
  if(rankScore!==currentRank)return rankScore>currentRank;
  if(score!==currentScore)return score>currentScore;
  if(timeMs!==currentTime)return timeMs<currentTime;
  return false;
}

export function dailyProgressFromRow(row,today=new Date().toISOString().slice(0,10)){
  if(!row||row.daily_date!==today)return{completed:[],mask:0,blockedMask:0,streak:Number(row?.daily_streak||0),longestStreak:Number(row?.longest_daily_streak||0)};
  const mask=Number(row.daily_complete_mask||0),blockedMask=Number(row.daily_blocked_mask||0);
  return{
    completed:Object.entries(DAILY_BITS).filter(([,bit])=>(mask&bit)!==0).map(([difficulty])=>difficulty),
    mask,
    blockedMask,
    streak:Number(row.daily_streak||0),
    longestStreak:Number(row.longest_daily_streak||0)
  };
}

export function masteryFromRow(row={}){
  return{
    easy:{games:Number(row.easy_clears||0),best:Number(row.easy_best_score||0),rank_score:Number(row.easy_rank_score||0),complete:Number(row.easy_clears||0)>0},
    medium:{games:Number(row.medium_clears||0),best:Number(row.medium_best_score||0),rank_score:Number(row.medium_rank_score||0),complete:Number(row.medium_clears||0)>0},
    hard:{games:Number(row.hard_clears||0),best:Number(row.hard_best_score||0),rank_score:Number(row.hard_rank_score||0),complete:Number(row.hard_clears||0)>0}
  };
}

export function rankingBoardFields(board='overall'){
  const value=['easy','medium','hard'].includes(board)?board:'overall';
  if(value==='overall')return{board:value,rank:'overall_rank_score',score:'overall_best_score',time:'overall_best_time_ms',achieved:'overall_achieved_at'};
  return{board:value,rank:`${value}_rank_score`,score:`${value}_best_score`,time:`${value}_best_time_ms`,achieved:`${value}_achieved_at`};
}
