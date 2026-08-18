import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES,DIFFICULTY_REWARDS} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const extract=(html,tag,className)=>{const start=html.indexOf(`<${tag} class="${className}"`),end=html.indexOf(`</${tag}>`,start);return html.slice(start,end+tag.length+3);};
const contentRoutes=['about','help','privacy','terms','how-to-play','daily-challenges','rankings-guide'];

test('build produced homepage game routes and guide routes',()=>{
  assert.ok(fs.existsSync(path.join(root,'dist/index.html')));
  for(const g of GAMES)assert.ok(fs.existsSync(path.join(root,`dist/${g.slug}/index.html`)));
  for(const route of contentRoutes)assert.ok(fs.existsSync(path.join(root,`dist/${route}/index.html`)));
});

test('header and footer are identical everywhere',()=>{
  const pages=[read('dist/index.html'),...GAMES.map(g=>read(`dist/${g.slug}/index.html`)),...contentRoutes.map(route=>read(`dist/${route}/index.html`))];
  const headers=pages.map(h=>extract(h,'header','site-header')),footers=pages.map(h=>extract(h,'footer','site-footer'));
  headers.slice(1).forEach(h=>assert.equal(h,headers[0]));
  footers.slice(1).forEach(f=>assert.equal(f,footers[0]));
});

test('all game pages retain shared platform controls rail daily and result contracts',()=>{
  for(const g of GAMES){
    const html=read(`dist/${g.slug}/index.html`);
    for(const id of ['newPuzzle','hint','solution','resetPuzzle','rankingList','profileBody','dailyProgress','resultModal'])assert.match(html,new RegExp(`id="${id}"`));
    assert.doesNotMatch(html,/id="undoAction"/);
    assert.match(html,/class="panel left-panel"/);
    assert.match(html,/class="right-panel"/);
    assert.match(html,/Best performance/);
    assert.match(html,/Only your best verified Regular Play performance sets your leaderboard score/);
  }
});

test('game status stays under board while game pages stay play-first and guides hold editorial depth',()=>{
  for(const g of GAMES){
    const html=read(`dist/${g.slug}/index.html`),left=html.slice(html.indexOf('class="panel left-panel"'),html.indexOf('</aside>',html.indexOf('class="panel left-panel"'))),board=html.indexOf('id="gameBoard"'),status=html.indexOf('id="gameStatus"'),guide=read(`dist/blog/how-to-play-${g.slug}/index.html`);
    assert.doesNotMatch(left,/id="gameStatus"/);
    assert.ok(status>board,`${g.key}: status belongs below board`);
    assert.match(html,/class="board-feedback"/);
    assert.doesNotMatch(html,/class="section game-seo"|class="section game-learn-more"/);
    assert.match(html,/class="section daily-section"/);
    assert.match(guide,/Rules and controls/);
    assert.match(guide,/Strategy that helps/);
    assert.match(guide,/Common mistakes/);
  }
});

test('Number Path keeps direct route correction',()=>{
  const src=read('src/js/games/number-path.js');
  assert.match(src,/checkpoint-conflict/);
  assert.match(src,/function backtrackTo\(position\)/);
  assert.match(src,/allowJumpBacktrack:true/);
  assert.match(src,/path=path\.slice\(0,position\+1\)/);
});

test('Solution never directly calls ranked completion',()=>{
  for(const file of ['echo-step-ui-v32.js','maze.js','number-path.js','color-connect-v8.js','lights-out.js','loop-puzzle.js','bridges.js']){
    const src=read(`src/js/games/${file}`),start=src.indexOf('solution()'),end=src.indexOf('previewScore',start),solution=src.slice(start,end);
    assert.doesNotMatch(solution,/onComplete\s*\(/);
  }
});

test('shared lifecycle keeps practice completion and dead-control disabling',()=>{
  const page=read('src/js/game-page.js');
  assert.match(page,/onPracticeComplete:message=>finishPractice/);
  assert.match(page,/practiceComplete/);
  assert.match(page,/showPracticeNotice/);
  assert.match(page,/setDisabled\('#hint'/);
  assert.match(page,/setDisabled\('#solution'/);
  assert.match(page,/setDisabled\('#resetPuzzle'/);
});

test('verified lifecycle is account-bound proof-driven and no longer writes immutable result history',()=>{
  const page=read('src/js/game-page.js'),results=read('functions/api/results.js'),attempts=read('functions/api/runs/start.js'),reveal=read('functions/api/runs/reveal.js'),scoring=read('functions/_lib/scoring.js');
  assert.match(page,/\/api\/runs\/reveal/);
  assert.match(results,/ranked_attempts/);
  assert.match(results,/user_game_stats/);
  assert.match(results,/serverTimeMs/);
  assert.doesNotMatch(results,/INSERT INTO results/);
  assert.match(reveal,/daily_blocked_mask/);
  assert.match(attempts,/ON CONFLICT\(user_id,game,difficulty,mode\)/);
  for(const term of ['verifyEchoStep','verifyMaze','verifyNumberPath','verifyColorConnect','verifyLightsOut','verifyLoop','verifyBridges'])assert.match(scoring,new RegExp(term));
});

test('ranking economy remains x1 x3 x5 but leaderboard uses personal best instead of cumulative farming',()=>{
  assert.deepEqual(DIFFICULTY_REWARDS,{easy:1,medium:3,hard:5});
  const games=read('functions/_lib/games.js'),results=read('functions/api/results.js'),rankings=read('functions/api/rankings.js');
  assert.match(games,/difficultyMultiplier/);
  assert.match(results,/candidateRankScore/);
  assert.match(results,/ranking_gain/);
  assert.match(rankings,/user_game_stats/);
  assert.doesNotMatch(rankings,/SUM\(ranking_points\)|GROUP BY user_id/);
  assert.doesNotMatch(results,/farmMultiplier|adjustedRegularPoints/);
});

test('Daily Challenge has no leaderboard award and stores only current state plus streak',()=>{
  const page=read('src/js/game-page.js'),results=read('functions/api/results.js'),migration=read('migrations/0005_free_tier_scalability.sql');
  assert.match(results,/body\.mode==='normal'\?rankingPoints/);
  assert.match(results,/body\.mode==='normal'\?rankingGain:0/);
  assert.match(migration,/daily_complete_mask/);
  assert.match(migration,/daily_streak/);
  assert.match(migration,/longest_daily_streak/);
  assert.doesNotMatch(page,/\+250 bonus earned|\+250 pts at 3\/3/);
});

test('rankings expose Overall Easy Medium Hard boards without multiplying rows',()=>{
  const page=read('src/js/game-page.js'),progression=read('functions/_lib/progression.js'),migration=read('migrations/0005_free_tier_scalability.sql');
  for(const board of ['overall','easy','medium','hard'])assert.match(page,new RegExp(`'${board}'`));
  assert.match(page,/ranking-board-tabs/);
  assert.match(progression,/rankingBoardFields/);
  assert.match(migration,/PRIMARY KEY \(user_id, game\)/);
});

test('profile progression is bounded in the same user game row',()=>{
  const profile=read('functions/api/profile.js'),page=read('src/js/game-page.js'),migration=read('migrations/0005_free_tier_scalability.sql');
  assert.match(profile,/statsPayload/);
  assert.match(page,/COMPLETES/);
  assert.match(page,/RANK PB/);
  assert.match(page,/LEVEL/);
  for(const field of ['games_completed','easy_clears','medium_clears','hard_clears','xp'])assert.match(migration,new RegExp(field));
});

test('attempt storage is bounded to one slot per user game difficulty and mode',()=>{
  const migration=read('migrations/0005_free_tier_scalability.sql'),attempts=read('functions/api/runs/start.js');
  assert.match(migration,/CREATE UNIQUE INDEX IF NOT EXISTS idx_ranked_attempts_slot/);
  assert.match(migration,/ON ranked_attempts\(user_id, game, difficulty, mode\)/);
  assert.match(attempts,/ON CONFLICT\(user_id,game,difficulty,mode\) DO UPDATE/);
  assert.doesNotMatch(attempts,/DELETE FROM ranked_attempts/);
});

test('legacy results are retained only as migration archive and no runtime API depends on them',()=>{
  const migration=read('migrations/0005_free_tier_scalability.sql');
  assert.match(migration,/read-only legacy archive/);
  for(const file of ['functions/api/results.js','functions/api/profile.js','functions/api/rankings.js','functions/api/runs/start.js','functions/api/runs/reveal.js'])assert.doesNotMatch(read(file),/\bFROM results\b|\bINTO results\b|\bJOIN results\b/);
});

test('instant loading optimization remains intact',()=>{
  const page=read('src/js/game-page.js'),site=read('src/js/site.js'),api=read('src/js/api.js');
  assert.match(page,/enginePromise=loadEngineFactory\(\)/);
  assert.match(page,/Promise\.all\(\[enginePromise,attemptPromise\]\)/);
  assert.match(page,/consumeRankedAttempt/);
  assert.match(site,/hydrateCachedAuth/);
  assert.match(site,/warmGameModule/);
  assert.match(api,/prefetchRankedAttempt/);
});

test('competitive ranking remains capped at eight with YOU motivation',()=>{
  const page=read('src/js/game-page.js'),api=read('functions/api/rankings.js');
  assert.match(page,/limit=8/);
  assert.match(page,/YOU/);
  assert.match(api,/Math\.min\(8/);
});

test('solution navigator remains capability-driven',()=>{
  const page=read('src/js/game-page.js');
  assert.match(page,/if\(!capability\('solutionSteps'\)\)return/);
  for(const game of GAMES)assert.equal(typeof game.capabilities.solutionSteps,'boolean');
});

test('SEO and guide content remain available',()=>{
  const home=read('dist/index.html'),sitemap=read('dist/sitemap.xml'),robots=read('dist/robots.txt');
  assert.match(home,/application\/ld\+json/);
  assert.match(home,/rel="canonical"/);
  assert.match(home,/Personal-Best Rankings/);
  for(const route of ['how-to-play','daily-challenges','rankings-guide','blog'])assert.match(sitemap,new RegExp(`${route}/`));
  for(const g of GAMES){
    assert.ok(fs.existsSync(path.join(root,`dist/blog/how-to-play-${g.slug}/index.html`)));
    assert.ok(fs.existsSync(path.join(root,`dist/brand/guides/${g.slug}.svg`)));
  }
  assert.match(robots,/Sitemap: https:\/\/snapoki\.com\/sitemap\.xml/);
});
