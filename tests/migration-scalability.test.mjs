import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const read=path=>fs.readFileSync(path,'utf8');
const migrations=[
  'migrations/0001_initial.sql',
  'migrations/0002_ranked_attempts.sql',
  'migrations/0003_scalable_game_ids.sql',
  'migrations/0004_admin_social_content.sql'
];

function dateOffset(days){
  const date=new Date();
  date.setUTCHours(12,0,0,0);
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}

function createLegacyDatabase(){
  const db=new DatabaseSync(':memory:');
  for(const migration of migrations)db.exec(read(migration));
  db.prepare(`INSERT INTO users (id,google_sub,email,display_name) VALUES (1,'sub-1','one@example.com','One'),(2,'sub-2','two@example.com','Two')`).run();
  return db;
}

function addResult(db,{id,runId,userId=1,game='maze',difficulty='easy',mode='normal',score,points,timeMs=30000,solution=0,playedDate=dateOffset(0),createdAt=`${playedDate}T12:00:00.000Z`}){
  db.prepare(`INSERT INTO results (id,run_id,user_id,game,difficulty,mode,score,ranking_points,time_ms,hints_used,solution_used,played_date,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,NULL,?)`).run(id,runId,userId,game,difficulty,mode,score,points,timeMs,solution,playedDate,createdAt);
}

function addDailySet(db,{startId,userId=1,game='maze',playedDate,points=100}){
  for(const [offset,difficulty] of ['easy','medium','hard'].entries())addResult(db,{id:startId+offset,runId:`daily-${startId+offset}`,userId,game,difficulty,mode:'daily',score:3000+offset*100,points,timeMs:45000+offset*1000,playedDate,createdAt:`${playedDate}T12:0${offset}:00.000Z`});
}

test('migration 0005 rehearses legacy PB, Daily streak and bounded attempt conversion',()=>{
  const db=createLegacyDatabase();

  // Regular history deliberately contains weaker repeats and ties so PB ordering is exercised.
  addResult(db,{id:1,runId:'normal-easy-old',difficulty:'easy',score:3900,points:840,timeMs:28000,playedDate:dateOffset(-20)});
  addResult(db,{id:2,runId:'normal-easy-pb',difficulty:'easy',score:4300,points:910,timeMs:26000,playedDate:dateOffset(-19)});
  addResult(db,{id:3,runId:'normal-medium',difficulty:'medium',score:4100,points:2700,timeMs:31000,playedDate:dateOffset(-18)});
  addResult(db,{id:4,runId:'normal-hard-slower',difficulty:'hard',score:4500,points:4200,timeMs:50000,playedDate:dateOffset(-17)});
  addResult(db,{id:5,runId:'normal-hard-pb',difficulty:'hard',score:4500,points:4200,timeMs:42000,playedDate:dateOffset(-16)});
  addResult(db,{id:6,runId:'practice-result',difficulty:'hard',score:4900,points:0,timeMs:20000,solution:1,playedDate:dateOffset(-15)});

  // Four-day completed Daily run ending today, plus an older two-day run.
  addDailySet(db,{startId:20,playedDate:dateOffset(-10)});
  addDailySet(db,{startId:23,playedDate:dateOffset(-9)});
  addDailySet(db,{startId:30,playedDate:dateOffset(-3)});
  addDailySet(db,{startId:33,playedDate:dateOffset(-2)});
  addDailySet(db,{startId:36,playedDate:dateOffset(-1)});
  addDailySet(db,{startId:39,playedDate:dateOffset(0)});
  // Today Solution on Medium must be represented in blocked mask without removing the valid completion bit.
  addResult(db,{id:50,runId:'daily-solution-medium',difficulty:'medium',mode:'daily',score:0,points:0,timeMs:10000,solution:1,playedDate:dateOffset(0)});

  // Second user proves one stats row is created only for games actually touched.
  addResult(db,{id:60,runId:'u2-normal',userId:2,game:'number-path',difficulty:'medium',score:4000,points:2500,timeMs:33000,playedDate:dateOffset(-1)});

  // Existing ephemeral attempts contain duplicate slots; 0005 must retain only newest rowid.
  db.prepare(`INSERT INTO ranked_attempts (run_id,user_id,game,difficulty,mode,seed,started_at,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).run('attempt-old',1,'maze','easy','normal','seed-old','2026-01-01T00:00:00Z','2099-01-01T00:00:00Z','2026-01-01T00:00:00Z');
  db.prepare(`INSERT INTO ranked_attempts (run_id,user_id,game,difficulty,mode,seed,started_at,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).run('attempt-new',1,'maze','easy','normal','seed-new','2026-01-02T00:00:00Z','2099-01-01T00:00:00Z','2026-01-02T00:00:00Z');

  const legacyCount=Number(db.prepare('SELECT COUNT(*) AS count FROM results').get().count);
  db.exec(read('migrations/0005_free_tier_scalability.sql'));

  const stats=db.prepare(`SELECT * FROM user_game_stats WHERE user_id=1 AND game='maze'`).get();
  assert.ok(stats,'legacy user/game should be backfilled');
  assert.equal(Number(stats.easy_rank_score),910);
  assert.equal(Number(stats.easy_best_score),4300);
  assert.equal(Number(stats.medium_rank_score),2700);
  assert.equal(Number(stats.hard_rank_score),4200);
  assert.equal(Number(stats.hard_best_time_ms),42000,'same rank+score PB must prefer lower verified time');
  assert.equal(Number(stats.overall_rank_score),4200);
  assert.equal(stats.overall_best_difficulty,'hard');
  assert.equal(Number(stats.overall_best_time_ms),42000);

  assert.equal(stats.daily_date,dateOffset(0));
  assert.equal(Number(stats.daily_complete_mask),7,'today Easy+Medium+Hard should be compacted to mask 7');
  assert.equal(Number(stats.daily_blocked_mask),2,'today Medium Solution should set blocked bit 2');
  assert.equal(Number(stats.daily_streak),4,'current streak should be the run ending today');
  assert.equal(Number(stats.longest_daily_streak),4,'longest streak should preserve the historical maximum');
  assert.equal(stats.last_daily_complete_date,dateOffset(0));

  assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM user_game_stats').get().count),2,'durable stats remain one row per touched user/game');
  assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM results').get().count),legacyCount,'legacy results archive must remain intact during rollback window');

  const attempts=db.prepare(`SELECT run_id,seed,solution_revealed,completed_at FROM ranked_attempts WHERE user_id=1 AND game='maze' AND difficulty='easy' AND mode='normal'`).all();
  assert.equal(attempts.length,1,'duplicate attempt slots must be compacted');
  assert.equal(attempts[0].run_id,'attempt-new');
  assert.equal(attempts[0].seed,'seed-new');
  assert.equal(Number(attempts[0].solution_revealed),0);
  assert.equal(attempts[0].completed_at,null);

  assert.throws(()=>db.prepare(`INSERT INTO ranked_attempts (run_id,user_id,game,difficulty,mode,seed,started_at,expires_at) VALUES ('attempt-conflict',1,'maze','easy','normal','seed','2026-01-03','2099-01-01')`).run(),/UNIQUE constraint failed/,'bounded slot unique index must reject a second current slot');

  const indexes=db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='user_game_stats' ORDER BY name`).all().map(row=>row.name);
  for(const expected of ['idx_user_game_stats_overall','idx_user_game_stats_easy','idx_user_game_stats_medium','idx_user_game_stats_hard'])assert.ok(indexes.includes(expected),`${expected} should exist`);

  db.close();
});
