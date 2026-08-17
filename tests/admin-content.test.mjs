import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {buildDailyContent,contentDate} from '../functions/_lib/social-content.js';
import {GAMES} from '../src/js/games-config.js';

test('daily social content is deterministic per date and variant',()=>{
  const a=buildDailyContent('2026-08-16',0),b=buildDailyContent('2026-08-16',0),c=buildDailyContent('2026-08-16',1);
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,c);
  assert.equal(a.date,'2026-08-16');
  assert.ok(a.linkedIn.includes('https://snapoki.com/'));
  assert.ok(a.instagram.includes('#Snapoki'));
  assert.ok(a.x.length<=280,'X copy must stay within 280 characters');
  assert.ok(a.x.includes(a.url),'template X copy must retain the exact game URL');
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
  assert.doesNotMatch(api,/CREATE TABLE IF NOT EXISTS/,'runtime requests should rely on the checked-in D1 migration');
  assert.match(page,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(page,/data-private-utility="true"/);
  assert.match(page,/id="deleteTodayBtn"/);
  assert.match(page,/id="deleteAllBtn"/);
  assert.match(page,/data-copy="linkedIn"/);
  assert.match(page,/data-copy="x"/);
  assert.match(page,/data-copy="instagram"/);
  assert.match(page,/id="generatorStatus"/);
  assert.match(page,/id="xText"[^>]*maxlength="280"/);
  assert.match(client,/\/api\/snapdesk-74kq\/content/);
  await assert.rejects(fs.access('public/admin/index.html'));
  await assert.rejects(fs.access('functions/api/admin/content.js'));
});

test('Gemini generation stays server-side, uses current 3.6 Flash contracts, and exposes safe fallback status',async()=>{
  const api=await fs.readFile('functions/api/snapdesk-74kq/content.js','utf8');
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  assert.match(api,/env\.GEMINI_API_KEY/);
  assert.match(api,/generativelanguage\.googleapis\.com\/v1beta\/models/);
  assert.match(api,/gemini-3\.6-flash/);
  assert.match(api,/x-goog-api-key/);
  assert.match(api,/responseFormat:\{/);
  assert.match(api,/text:\{/);
  assert.match(api,/mimeType:'application\/json'/);
  assert.match(api,/schema:\{/);
  assert.doesNotMatch(api,/responseMimeType|responseSchema/,'Gemini 3.6 should use responseFormat rather than legacy structured-output fields');
  assert.match(api,/thinkingConfig:\{thinkingLevel:'low'\}/);
  assert.doesNotMatch(api,/thinkingBudget|temperature:/);
  assert.match(api,/generator:'template'/);
  assert.match(api,/generator:'template-fallback'/);
  assert.match(api,/generationError:safeGenerationError/);
  assert.match(api,/payload\.x=xCopy\(body\.x,payload\.url\)/,'manual X edits must be revalidated server-side');
  assert.match(api,/payload\.linkedIn=includeUrl\(body\.linkedIn,payload\.url/);
  assert.match(api,/payload\.instagram=instagramCopy\(body\.instagram,payload\.url\)/);
  assert.match(client,/Template fallback/);
  assert.match(client,/Gemini · \$\{model\}/);
  assert.doesNotMatch(client,/GEMINI_API_KEY/);
  assert.doesNotMatch(client,/generativelanguage\.googleapis\.com/);
});

test('social image is one square image-first card with a short presentation-driven hook and subtle watermark',async()=>{
  const page=await fs.readFile('public/snapdesk-74kq/index.html','utf8');
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  const presentation=await fs.readFile('src/js/game-presentation.js','utf8');
  const renderer=await fs.readFile('src/js/social-game-board.js','utf8');
  assert.match(page,/id="downloadSquareBtn"/);
  assert.match(page,/1080 × 1080 · use on every social platform/);
  assert.match(page,/width="1080" height="1080"/);
  assert.doesNotMatch(page,/downloadPortraitBtn|downloadLandscapeBtn|1080×1350|1200×675/);
  assert.match(client,/canvas\.width=1080;canvas\.height=1080/);
  assert.match(client,/const boardSize=900/,'square card should devote most of its canvas to the game board');
  assert.match(client,/function imageHook/);
  assert.match(client,/getGamePresentation\(game\)\.socialHook/);
  assert.match(presentation,/socialHook:'Can YOU and Echo finish together\?'/);
  assert.match(client,/first\.length>=8&&first\.length<=42/,'image headline should stay short');
  assert.match(client,/globalAlpha=\.34/);
  assert.match(client,/fillText\('snapoki\.com'/);
  assert.doesNotMatch(client,/drawPortrait|drawLandscape|WHY IT IS INTERESTING|NO SOLUTION SHOWN|NO HINTS/);
  assert.match(renderer,/plugin\.generator\('hard'/);
  assert.doesNotMatch(renderer,/solveMaze|solution-edge|color-solution-line/,'social renderer should show unsolved boards only');
  execFileSync(process.execPath,['--check','src/js/admin-content.js'],{stdio:'pipe'});
  execFileSync(process.execPath,['--check','src/js/social-game-board.js'],{stdio:'pipe'});
});

test('Content Desk core is game-agnostic and registered games plug in by naming convention',async()=>{
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  const social=await fs.readFile('src/js/social-game-board.js','utf8');
  const content=await fs.readFile('functions/_lib/social-content.js','utf8');
  assert.match(social,/import\(`\.\/games\/\$\{slug\}\.js`\)/);
  assert.match(social,/import\(`\.\/social-renderers\/\$\{slug\}\.js`\)/);
  assert.match(social,/function generatorName\(slug\)/);
  assert.match(social,/renderer:'fallback'/,'missing custom artwork must degrade safely instead of breaking admin');
  for(const game of GAMES){
    const rendererFile=`src/js/social-renderers/${game.slug}.js`;
    const rendererSource=await fs.readFile(rendererFile,'utf8');
    assert.match(rendererSource,/export function drawSocialBoard\(/,`${game.key} must expose the social renderer convention`);
    execFileSync(process.execPath,['--check',rendererFile],{stdio:'pipe'});
    for(const literal of [game.key,game.slug]){
      assert.doesNotMatch(client,new RegExp(`['\"]${literal}['\"]`),`admin client must not hard-code ${literal}`);
      assert.doesNotMatch(social,new RegExp(`['\"]${literal}['\"]`),`social plugin loader must not hard-code ${literal}`);
      assert.doesNotMatch(content,new RegExp(`['\"]${literal}['\"]`),`social content generator must not hard-code ${literal}`);
    }
  }
});
