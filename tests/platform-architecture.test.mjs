import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES} from '../src/js/games-config.js';
import {getGamePresentation} from '../src/js/game-presentation.js';
import {RESULT_VERIFIERS} from '../functions/_lib/scoring.js';

const read=file=>fs.readFileSync(file,'utf8');

test('game registry and ranked verifier registry stay in one-to-one parity',()=>{
  assert.deepEqual(Object.keys(RESULT_VERIFIERS).sort(),GAMES.map(game=>game.key).sort());
});

test('every registered game has one engine entry and generated launch surfaces',()=>{
  for(const game of GAMES){
    assert.ok(fs.existsSync(`src/js/games/${game.slug}.js`),`${game.key}: source engine`);
    assert.ok(fs.existsSync(`dist/${game.slug}/index.html`),`${game.key}: built page`);
    assert.ok(fs.existsSync(`dist/blog/how-to-play-${game.slug}/index.html`),`${game.key}: guide`);
    const page=read(`dist/${game.slug}/index.html`);
    const release=JSON.parse(read('dist/release.json'));
    const assets=game.experienceType==='simulation'?['board-status.css',...getGamePresentation(game).styles]:['how-to-card.css','board-status.css','board-contract.css'];
    for(const asset of assets)assert.ok(page.includes(`${release.assetsBase}styles/${asset}`),`${game.key}: versioned ${asset}`);
  }
});

test('presentation registry has a usable zero-CSS fallback for a future game',()=>{
  const future={key:'future-puzzle',slug:'future-puzzle',name:'Future Puzzle',howTo:['Make a move.','Follow the rule.','Finish the board.']};
  const presentation=getGamePresentation(future);
  assert.deepEqual(presentation.styles,[]);
  assert.equal(presentation.solutionLabel,'Solution');
  assert.deepEqual(presentation.goal.tokens,['FUTURE PUZZLE']);
  assert.equal(presentation.rows.length,3);
  assert.match(presentation.socialHook,/Future Puzzle/);
});

test('shared runtime owns status and presentation instead of game-specific build patches',()=>{
  const runtime=read('src/js/game-page.js'),build=read('package.json'),status=read('src/js/game-status.js');
  assert.match(runtime,/getGamePresentation/);
  assert.match(runtime,/renderGameStatus/);
  assert.match(runtime,/engineLocked/);
  assert.match(status,/presentGameStatus/);
  for(const obsolete of ['echo-step-integration.mjs','echo-launch-final.mjs','apply-board-contract.mjs','post-build-ui-safety.mjs']){
    assert.doesNotMatch(build,new RegExp(obsolete.replaceAll('.','\\.')));
    assert.equal(fs.existsSync(`scripts/${obsolete}`),false);
  }
});

test('guide and social systems have safe generic fallbacks for a future game',()=>{
  const launch=read('scripts/launch-readiness.mjs'),social=read('src/js/social-game-board.js'),shared=read('src/js/social-renderers/shared.js');
  assert.match(launch,/return svgShell\(name,/,'guide artwork must have a generic fallback');
  const guide=read('src/js/game-guide.js');
  assert.match(launch,/const extra=getGameGuide\(g\)/,'guide generation must use a typed editorial contract');
  assert.match(guide,/export function getGameGuide\(game\)/,'guide copy must have a generic fallback');
  assert.match(social,/import \{drawFallback\} from '\.\/social-renderers\/shared\.js'/);
  assert.match(shared,/export function drawFallback/);
  assert.match(social,/if\(!generated\)\{drawFallback/);
});

test('repository syntax check is generic instead of hard-coded to one game',()=>{
  const pkg=JSON.parse(read('package.json')),check=read('scripts/check.mjs');
  assert.equal(pkg.scripts.check,'node scripts/check.mjs && node scripts/admin-plugin-audit.mjs');
  for(const root of ['src/js','functions','scripts','tests'])assert.ok(check.includes(`'${root}'`),`${root} must be syntax checked`);
  assert.doesNotMatch(check,/bridges|echo-step|number-path|color-connect|lights-out|loop-puzzle/);
});

test('platform audit precedes final immutable asset packaging',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.match(pkg.scripts.build,/scripts\/platform-audit\.mjs && node scripts\/version-assets\.mjs$/);
  const audit=read('scripts/platform-audit.mjs');
  for(const contract of ['dead internal reference','missing server result verifier','guide content is too thin','canonical missing from sitemap','public page links to private Content Desk'])assert.match(audit,new RegExp(contract));
});
