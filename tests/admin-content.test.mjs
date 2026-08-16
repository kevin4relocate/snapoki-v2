import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {buildDailyContent,contentDate} from '../functions/_lib/social-content.js';

test('daily social content is deterministic per date and variant',()=>{
  const a=buildDailyContent('2026-08-16',0),b=buildDailyContent('2026-08-16',0),c=buildDailyContent('2026-08-16',1);
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,c);
  assert.equal(a.date,'2026-08-16');
  assert.ok(a.linkedIn.includes('https://snapoki.com/'));
  assert.ok(a.instagram.includes('#Snapoki'));
  assert.ok(a.x.length<=280,'X copy must stay within 280 characters');
});

test('content date follows Vietnam local day',()=>{
  assert.equal(contentDate(new Date('2026-08-16T16:30:00Z')),'2026-08-16');
  assert.equal(contentDate(new Date('2026-08-16T17:30:00Z')),'2026-08-17');
});

test('content desk storage is a singleton and predictable admin routes are gone',async()=>{
  const migration=await fs.readFile('migrations/0004_admin_social_content.sql','utf8');
  const api=await fs.readFile('functions/api/snapdesk-74kq/content.js','utf8');
  const page=await fs.readFile('public/snapdesk-74kq/index.html','utf8');
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  assert.match(migration,/PRIMARY KEY CHECK \(id = 1\)/);
  assert.match(api,/ON CONFLICT\(id\) DO UPDATE/);
  assert.match(api,/DELETE FROM admin_social_content/);
  assert.match(page,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(page,/data-private-utility="true"/);
  assert.match(page,/id="deleteTodayBtn"/);
  assert.match(page,/id="deleteAllBtn"/);
  assert.match(page,/data-copy="linkedIn"/);
  assert.match(page,/data-copy="x"/);
  assert.match(page,/data-copy="instagram"/);
  assert.match(client,/\/api\/snapdesk-74kq\/content/);
  await assert.rejects(fs.access('public/admin/index.html'));
  await assert.rejects(fs.access('functions/api/admin/content.js'));
});

test('Gemini generation stays server-side and falls back when no key is configured',async()=>{
  const api=await fs.readFile('functions/api/snapdesk-74kq/content.js','utf8');
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  assert.match(api,/env\.GEMINI_API_KEY/);
  assert.match(api,/generativelanguage\.googleapis\.com\/v1beta\/models/);
  assert.match(api,/gemini-2\.5-flash/);
  assert.match(api,/x-goog-api-key/);
  assert.match(api,/responseMimeType:'application\/json'/);
  assert.match(api,/thinkingBudget:0/);
  assert.match(api,/generator:'template'/);
  assert.match(api,/generator:'template-fallback'/);
  assert.doesNotMatch(api,/OPENAI_API_KEY|api\.openai\.com|gpt-5\.6-luna/);
  assert.doesNotMatch(client,/GEMINI_API_KEY/);
  assert.doesNotMatch(client,/generativelanguage\.googleapis\.com/);
});

test('social image is one square image-first card with a short hook and subtle watermark',async()=>{
  const page=await fs.readFile('public/snapdesk-74kq/index.html','utf8');
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  const renderer=await fs.readFile('src/js/social-game-board.js','utf8');
  assert.match(page,/id="downloadSquareBtn"/);
  assert.match(page,/1080 × 1080 · use on every social platform/);
  assert.match(page,/width="1080" height="1080"/);
  assert.doesNotMatch(page,/downloadPortraitBtn|downloadLandscapeBtn|1080×1350|1200×675/);
  assert.match(client,/canvas\.width=1080;canvas\.height=1080/);
  assert.match(client,/const boardSize=900/,'square card should devote most of its canvas to the game board');
  assert.match(client,/function imageHook/);
  assert.match(client,/first\.length>=8&&first\.length<=42/,'image headline should stay short');
  assert.match(client,/globalAlpha=\.34/);
  assert.match(client,/fillText\('snapoki\.com'/);
  assert.doesNotMatch(client,/drawPortrait|drawLandscape|WHY IT IS INTERESTING|NO SOLUTION SHOWN|NO HINTS/);
  for(const name of ['generateMaze','generateNumberPath','generateColorConnect','generateLightsOut','generateLoopPuzzle'])assert.match(renderer,new RegExp(name));
  assert.match(renderer,/generator\('hard'/);
  assert.doesNotMatch(renderer,/solveMaze|solution-edge|color-solution-line/,'social renderer should show unsolved boards only');
  execFileSync(process.execPath,['--check','src/js/admin-content.js'],{stdio:'pipe'});
  execFileSync(process.execPath,['--check','src/js/social-game-board.js'],{stdio:'pipe'});
});
