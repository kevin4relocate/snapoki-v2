import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validGameDifficulty,validGameMode} from '../functions/_lib/games.js';
import {anomalyAssessment,rankedMinimumMs} from '../functions/_lib/ranking-policy.js';
import {dailyProgressFromRow} from '../functions/_lib/progression.js';
import {verifyAndScoreResult} from '../functions/_lib/scoring.js';
import {generateNumberPath} from '../src/js/games/number-path.js';
import {generateColorConnect} from '../src/js/games/color-connect.js';
import {generateBridges} from '../src/js/games/bridges-core.js';
import {scoreTimeDivisor} from '../src/js/games/utils.js';

function numberProof(difficulty,seed,mistakes=0){const p=generateNumberPath(difficulty,seed);return{seed,size:p.size,cells:p.openCount,open_cells:p.openCount,blocked_cells:p.blocked.length,mistakes,path:[...p.solution]};}
function colorProof(difficulty,seed,redraws=0){const p=generateColorConnect(difficulty,seed);return{seed,size:p.size,paths:p.segments.length,open_cells:p.openCount,blocked_cells:p.blocked.length,redraws,routes:p.segments.map((segment,color)=>({color,path:[...segment.path]}))};}
function bridgesProof(difficulty,seed){const p=generateBridges(difficulty,seed),actions=[];for(let edgeIndex=0;edgeIndex<p.solution.length;edgeIndex++)for(let value=1;value<=p.solution[edgeIndex];value++)actions.push(`${edgeIndex}:${value}`);return{p,metadata:{seed,size:p.size,islands:p.islands.length,candidate_edges:p.edges.length,links:p.solution.filter(Boolean).length,moves:actions.length,ideal_moves:p.solution.reduce((sum,value)=>sum+value,0),bridges:[...p.solution],actions}};}

test('game-specific validation rejects unsupported difficulty and mode contracts',()=>{
  assert.equal(validGameDifficulty('maze','hard'),true);
  assert.equal(validGameDifficulty('maze','extreme'),false);
  assert.equal(validGameDifficulty('unknown','easy'),false);
  assert.equal(validGameMode('maze','normal'),true);
  assert.equal(validGameMode('maze','daily'),true);
  assert.equal(validGameMode('maze','global'),false);
});

test('every current game has explicit score and anti-cheat timing policy',()=>{
  for(const game of ['echo-step','maze','number-path','color-connect','lights-out','loop-puzzle','bridges'])for(const difficulty of ['easy','medium','hard']){
    assert.ok(Number(scoreTimeDivisor(game,difficulty))>0,`${game}/${difficulty} score divisor`);
    assert.ok(Number(rankedMinimumMs(game,difficulty))>=1000,`${game}/${difficulty} anti-cheat floor`);
  }
  assert.equal(scoreTimeDivisor('future-game','easy'),null);
  assert.equal(rankedMinimumMs('future-game','easy'),null);
});

test('extreme hourly volume is independently ranking-excluding',()=>{
  const assessment=anomalyAssessment({game:'maze',difficulty:'easy',timeMs:12000,score:4000,recentHourlyFinishes:60});
  assert.equal(assessment.suspicious,true);
  assert.ok(assessment.reasons.includes('extreme_hourly_volume'));
});

test('Daily verification can remain bound to its issued seed across UTC midnight',()=>{
  const seed='number-path:2026-08-31:easy',metadata=numberProof('easy',seed);
  const checked=verifyAndScoreResult({game:'number-path',difficulty:'easy',mode:'daily',time_ms:30000,hints_used:0,metadata,expected_seed:seed});
  assert.equal(checked.ok,true,checked.reason);
});

test('client-only mistake and redraw counters no longer change competitive score',()=>{
  const numberSeed='number-path:easy:integrity',cleanNumber=verifyAndScoreResult({game:'number-path',difficulty:'easy',mode:'normal',time_ms:30000,hints_used:0,metadata:numberProof('easy',numberSeed,0)}),dirtyNumber=verifyAndScoreResult({game:'number-path',difficulty:'easy',mode:'normal',time_ms:30000,hints_used:0,metadata:numberProof('easy',numberSeed,20)});
  assert.equal(cleanNumber.ok,true);assert.equal(dirtyNumber.ok,true);assert.equal(cleanNumber.score,dirtyNumber.score);
  const colorSeed='color-connect:easy:integrity',cleanColor=verifyAndScoreResult({game:'color-connect',difficulty:'easy',mode:'normal',time_ms:30000,hints_used:0,metadata:colorProof('easy',colorSeed,0)}),dirtyColor=verifyAndScoreResult({game:'color-connect',difficulty:'easy',mode:'normal',time_ms:30000,hints_used:0,metadata:colorProof('easy',colorSeed,20)});
  assert.equal(cleanColor.ok,true);assert.equal(dirtyColor.ok,true);assert.equal(cleanColor.score,dirtyColor.score);
});

test('Bridges verifier rejects impossible 0-to-2 action jumps',()=>{
  const {p,metadata}=bridgesProof('easy','bridges:easy:integrity-jump');
  const index=p.solution.findIndex(value=>value===2);
  if(index<0)return;
  const badActions=[...metadata.actions],first=badActions.findIndex(action=>action.startsWith(`${index}:`));
  badActions.splice(first,2,`${index}:2`);
  const checked=verifyAndScoreResult({game:'bridges',difficulty:'easy',mode:'normal',time_ms:60000,hints_used:0,metadata:{...metadata,actions:badActions,moves:badActions.length}});
  assert.equal(checked.ok,false);
});

test('stale Daily streak is hidden after a missed day',()=>{
  const row={daily_date:'2026-08-29',daily_streak:7,longest_daily_streak:9,last_daily_complete_date:'2026-08-29'};
  assert.equal(dailyProgressFromRow(row,'2026-09-01').streak,0);
  assert.equal(dailyProgressFromRow({...row,last_daily_complete_date:'2026-08-31'},'2026-09-01').streak,7);
});

test('ranked reset, Hint authority, Daily semantics and leaderboard target fixes remain wired',()=>{
  const start=fs.readFileSync('functions/api/runs/start.js','utf8'),results=fs.readFileSync('functions/api/results.js','utf8'),hint=fs.readFileSync('functions/api/runs/hint.js','utf8'),api=fs.readFileSync('src/js/api.js','utf8'),global=fs.readFileSync('functions/api/global-rankings.js','utf8');
  assert.match(start,/run_id:previous\.run_id/);
  assert.match(start,/reason:'hinted_reset'/);
  assert.match(results,/serverHints=Math\.max\(0,Number\(attempt\.hint_count/);
  assert.doesNotMatch(results,/hints_used:body\.hints_used/);
  assert.match(results,/dailyUpdate[\s\S]*daily_complete_mask/);
  assert.doesNotMatch(results,/function dailyUpdate[\s\S]{0,500}games_completed=games_completed/);
  assert.match(hint,/SET hint_count=hint_count\+1/);
  assert.match(api,/await post\('\/api\/runs\/hint'/);
  assert.match(global,/ORDER BY \$\{board\.primary\} ASC,\$\{board\.secondary\} ASC,user_id DESC LIMIT 1/);
  assert.match(global,/google_sub NOT LIKE 'demo:%'/);
});

test('integrity migration remains bounded instead of adding history tables',()=>{
  const migration=fs.readFileSync('migrations/0008_platform_integrity.sql','utf8');
  assert.match(migration,/ALTER TABLE ranked_attempts ADD COLUMN hint_count/);
  assert.match(migration,/ALTER TABLE users ADD COLUMN ranked_hour_bucket/);
  assert.match(migration,/ALTER TABLE users ADD COLUMN ranked_hour_count/);
  assert.doesNotMatch(migration,/CREATE TABLE/i);
});
