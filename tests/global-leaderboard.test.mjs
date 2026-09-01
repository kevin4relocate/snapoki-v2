import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const read=path=>fs.readFile(path,'utf8');

test('global leaderboard keeps aggregate state on the existing user row',async()=>{
  const migration=await read('migrations/0006_global_leaderboard_totals.sql');
  assert.match(migration,/ALTER TABLE users ADD COLUMN career_xp/);
  assert.match(migration,/ALTER TABLE users ADD COLUMN career_runs/);
  assert.match(migration,/ALTER TABLE users ADD COLUMN mastery_score/);
  assert.match(migration,/trg_user_game_stats_leaderboard_update/);
  assert.match(migration,/SUM\(overall_rank_score\)/);
  assert.doesNotMatch(migration,/CREATE TABLE.*leaderboard/i);
});

test('global leaderboard API exposes bounded Career, Skill and Runs boards',async()=>{
  const api=await read('functions/api/global-rankings.js');
  for(const board of ['career','skill','runs'])assert.match(api,new RegExp(`${board}:`));
  assert.match(api,/career_xp/);
  assert.match(api,/mastery_score/);
  assert.match(api,/career_runs/);
  assert.match(api,/LIMIT \?/);
  assert.match(api,/cache-control/);
});

test('global leaderboard page is generated after account profile generation',async()=>{
  const script=await read('scripts/global-leaderboard.mjs');
  const packageJson=await read('package.json');
  assert.match(script,/path\.join\(dist,'leaderboard'\)/);
  assert.match(script,/path\.join\(dir,'index\.html'\)/);
  assert.match(script,/global-leaderboard\.css/);
  assert.match(script,/global-leaderboard\.js/);
  assert.match(script,/sitemap\.xml/);
  assert.match(packageJson,/account-profile\.mjs && node scripts\/global-leaderboard\.mjs/);
});

test('global leaderboard UI has the three motivation paths and a persistent YOU area',async()=>{
  const ui=await read('src/js/global-leaderboard.js');
  const css=await read('src/styles/global-leaderboard.css');
  assert.match(ui,/\['career','Most XP'\]/);
  assert.match(ui,/\['skill','Best Score'\]/);
  assert.match(ui,/\['runs','Most Played'\]/);
  assert.match(ui,/YOU/);
  assert.match(ui,/leaderboardSignIn/);
  assert.match(css,/leaderboard-row\.is-me/);
  assert.match(css,/max-width:760px/);
});
