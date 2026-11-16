import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES} from '../src/js/games-config.js';
import {restoreWorldLoopSelection,sortWorldLoopCodes,WORLD_LOOP_AUDIO_SRC} from '../src/js/games/world-loop.js';

const text=p=>fs.readFileSync(p,'utf8');
const world=GAMES.find(game=>game.key==='world-loop');

test('World Loop route is included in the built static Pages output, not a client-side-only path',()=>{
  assert.ok(world,'World Loop missing from registry');
  assert.equal(world.slug,'world-loop');
  assert.equal(world.experienceType,'simulation');
  assert.equal(world.capabilities.daily,false);
  assert.ok(fs.existsSync('dist/world-loop/index.html'),'Cloudflare Pages needs world-loop/index.html');
  const html=text('dist/world-loop/index.html');
  assert.match(html,/data-game="world-loop"/);
  assert.match(html,/<title>World Loop/);
  assert.match(html,/id="gameBoard"/);
  assert.match(html,/https:\/\/snapoki\.com\/world-loop\//);
  const guide=text('dist/blog/how-to-play-world-loop/index.html');
  assert.match(guide,/Endless format/);
  const sitemap=text('dist/sitemap.xml');
  assert.match(sitemap,/<loc>https:\/\/snapoki\.com\/world-loop\/<\/loc>/);
  const homepage=text('dist/index.html');
  assert.match(homepage,/href="\/world-loop\/"/);
  assert.ok(fs.existsSync('dist/404.html'));
});

test('World Loop CSS, engine, social renderer and music ship together in the same release',()=>{
  const release=JSON.parse(text('dist/release.json'));
  const html=text('dist/world-loop/index.html');
  for(const asset of ['js/game-page.js','js/games/world-loop.js','js/social-renderers/world-loop.js','styles/world-loop.css']){
    assert.ok(release.assets[asset],`Missing release manifest asset: ${asset}`);
    assert.ok(fs.existsSync('dist'+release.assetsBase+asset),`Missing fingerprinted asset: ${asset}`);
  }
  assert.ok(html.includes(release.assetsBase+'styles/world-loop.css'),'Game must link to release-pinned CSS');
  assert.ok(html.includes(release.assetsBase+'js/game-page.js'),'Game must link to release-pinned JS');
  assert.doesNotMatch(html,/\/assets\/(js|styles)\/[a-z0-9/-]+\.(js|css)/i,'HTML must not point at unversioned assets');
  assert.equal(WORLD_LOOP_AUDIO_SRC,'/audio/world-loop/endless-circuit.mp3');
  assert.ok(fs.statSync('dist'+WORLD_LOOP_AUDIO_SRC).size>1024,'World Loop music asset missing or empty');
});

test('World Loop roster restores defaults from malformed and non-array localStorage',()=>{
  const expected=sortWorldLoopCodes(['VN','JP','US','BR','FR','KR','DE','GB']);
  for(const corrupted of ['{bad json','null','{}','false','42','"hello"','[null,true,{"code":"VN"}]','[]']){
    assert.deepEqual(restoreWorldLoopSelection(corrupted),expected,`Invalid saved roster ${corrupted}`);
  }
});

test('World Loop restores a unique, valid, bounded selection in stable order',()=>{
  const restored=restoreWorldLoopSelection(JSON.stringify(['VN','JP','VN','ZZ','US','FR','JP','DE','GB','BR']));
  assert.deepEqual(restored,sortWorldLoopCodes(['VN','JP','US','FR','DE','GB','BR']));
  assert.equal(new Set(restored).size,restored.length);
  assert.ok(restored.length>=4&&restored.length<=12);
});

test('Cloudflare functions routing must not intercept World Loop static route',()=>{
  const routes=JSON.parse(text('dist/_routes.json'));
  assert.deepEqual(routes.include,['/api/*']);
  assert.ok(!routes.include.includes('/*'));
  const middleware=text('functions/_middleware.js');
  assert.match(middleware,/ACTIVE_PATHS/);
  assert.match(text('scripts/verify-production.mjs'),/\/world-loop\//);
});
