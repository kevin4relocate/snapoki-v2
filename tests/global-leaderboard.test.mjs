import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const read=path=>fs.readFile(path,'utf8');

test('legacy leaderboard storage can remain dormant without public exposure',async()=>{
  const migration=await read('migrations/0006_global_leaderboard_totals.sql');
  assert.match(migration,/ALTER TABLE users ADD COLUMN career_xp/);
  assert.doesNotMatch(migration,/CREATE TABLE.*leaderboard/i);
});

test('public build does not generate or link a global leaderboard',async()=>{
  const packageJson=await read('package.json');
  const home=await read('dist/index.html');
  await assert.rejects(()=>fs.access('dist/leaderboard/index.html'));
  assert.doesNotMatch(packageJson,/node scripts\/global-leaderboard\.mjs/);
  assert.doesNotMatch(packageJson,/node scripts\/leaderboard-nav\.mjs/);
  assert.doesNotMatch(home,/href="\/leaderboard\//);
  assert.doesNotMatch(home,/Leaderboard/);
});

test('game pages have no competitive ranking rail',async()=>{
  const build=await read('scripts/build.mjs');
  assert.doesNotMatch(build,/class="panel rankings"/);
  assert.doesNotMatch(build,/id="rankingList"/);
  assert.doesNotMatch(build,/leaderboardSignIn/);
});
