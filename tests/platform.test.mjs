import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES,DIFFICULTY_REWARDS} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const extract=(html,tag,className)=>{const start=html.indexOf(`<${tag} class="${className}"`),end=html.indexOf(`</${tag}>`,start);return html.slice(start,end+tag.length+3);};
const contentRoutes=['about','help','privacy','terms','how-to-play','daily-challenges'];

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
    if(g.experienceType==='simulation'){
      assert.match(html,/class="game-layout world-loop-layout"/);
      assert.doesNotMatch(html,/class="panel left-panel"|class="right-panel"|class="section daily-section"/);
      assert.match(html,/id="gameBoard"/);
      continue;
    }
    for(const id of ['newPuzzle','hint','solution','resetPuzzle','dailyProgress','resultModal'])assert.match(html,new RegExp(`id="${id}"`));
    assert.doesNotMatch(html,/id="undoAction"|id="rankingList"|id="profileBody"/);
    assert.match(html,/class="panel left-panel"/);
    assert.match(html,/class="right-panel"/);
    assert.doesNotMatch(html,/Personal Best|Your best score counts\.|Sign in/);
  }
});

test('game status stays under board while game pages stay play-first and guides hold editorial depth',()=>{
  for(const g of GAMES){
    const html=read(`dist/${g.slug}/index.html`),left=html.slice(html.indexOf('class="panel left-panel"'),html.indexOf('</aside>',html.indexOf('class="panel left-panel"'))),board=html.indexOf('id="gameBoard"'),status=html.indexOf('id="gameStatus"'),guide=read(`dist/blog/how-to-play-${g.slug}/index.html`);
    assert.doesNotMatch(left,/id="gameStatus"/);
    assert.ok(status>board,`${g.key}: status belongs below board`);
    assert.match(html,/class="board-feedback"/);
    assert.doesNotMatch(html,/class="section game-seo"|class="section game-learn-more"/);
    if(g.experienceType==='simulation')assert.doesNotMatch(html,/class="section daily-section"/);
    else assert.match(html,/class="section daily-section"/);
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

test('public lifecycle never starts or submits account-bound ranked attempts',()=>{
  const page=read('src/js/game-page.js');
  assert.match(page,/async function rankedAttempt\(\)\{return null;\}/);
  assert.doesNotMatch(page,/\/api\/runs\/reveal|\/api\/results|refreshRankings|refreshProfile/);
  assert.match(page,/snapoki:daily:v1:/);
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

test('Daily Challenge stores completion and streak only in browser localStorage',()=>{
  const page=read('src/js/game-page.js');
  assert.match(page,/localStorage\.getItem/);
  assert.match(page,/localStorage\.setItem/);
  assert.match(page,/markLocalDailyComplete/);
  assert.match(page,/last_complete/);
  assert.doesNotMatch(page,/\/api\/results|daily_blocked_mask/);
});

test('public game runtime exposes no ranking boards',()=>{
  const page=read('src/js/game-page.js'),build=read('scripts/build.mjs');
  assert.doesNotMatch(page,/ranking-board-tabs|refreshRankings|rankingRow/);
  assert.doesNotMatch(build,/id="rankingList"|class="panel rankings"/);
});

test('public game runtime exposes no profile progression',()=>{
  const page=read('src/js/game-page.js'),build=read('scripts/build.mjs');
  assert.doesNotMatch(page,/refreshProfile|masteryMarkup|COMPLETES|RANK PB/);
  assert.doesNotMatch(build,/id="profileBody"|class="panel profile"/);
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

test('instant guest loading remains intact without auth bootstrap',()=>{
  const page=read('src/js/game-page.js'),site=read('src/js/site.js');
  assert.match(page,/enginePromise=loadEngineFactory\(\)/);
  assert.match(page,/Promise\.all\(\[enginePromise,attemptPromise\]\)/);
  assert.match(site,/warmGameModule/);
  assert.doesNotMatch(site,/SnapokiAuth|refreshAuth|Google|loginButton|\/api\/me/);
});

test('public pages contain no competitive ranking surface',()=>{
  const page=read('src/js/game-page.js'),home=read('dist/index.html');
  assert.doesNotMatch(page,/limit=8|rankingList|leaderboard|\bYOU\b/);
  assert.doesNotMatch(home,/Leaderboard|Personal-Best Rankings|Sign in/);
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
  assert.match(home,/Play Instantly/);
  assert.doesNotMatch(home,/Personal-Best Rankings|Sign in/);
  for(const route of ['how-to-play','daily-challenges','blog'])assert.match(sitemap,new RegExp(`${route}/`));
  assert.doesNotMatch(sitemap,/rankings-guide|leaderboard|profile/);
  for(const g of GAMES){
    assert.ok(fs.existsSync(path.join(root,`dist/blog/how-to-play-${g.slug}/index.html`)));
    assert.ok(fs.existsSync(path.join(root,`dist/brand/guides/${g.slug}.svg`)));
  }
  assert.match(robots,/Sitemap: https:\/\/snapoki\.com\/sitemap\.xml/);
});
