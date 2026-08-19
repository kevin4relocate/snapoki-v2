import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('game pages remove the visible Profile rail without losing Daily state hydration',()=>{
  for(const game of GAMES){
    const html=read(`dist/${game.slug}/index.html`);
    assert.doesNotMatch(html,/class="panel profile"/);
    assert.doesNotMatch(html,/<strong>Your profile<\/strong>/);
    assert.match(html,/<div id="profileBody" hidden><\/div>/);
    const right=html.slice(html.indexOf('<aside class="right-panel">'),html.indexOf('</aside>',html.indexOf('<aside class="right-panel">')));
    assert.match(right,/class="panel how-to"/);
    assert.match(right,/class="panel rankings"/);
    assert.doesNotMatch(right,/class="panel profile"/);
    assert.ok(html.indexOf('class="section daily-section"')>html.indexOf('</aside>',html.indexOf('<aside class="right-panel">')));
  }
  const runtime=read('src/js/game-page.js');
  assert.match(runtime,/refreshProfile/);
  assert.match(runtime,/state\.dailyCompleted=data\?\.user\?\(data\.daily_completed\|\|\[\]\):\[\]/);
});

test('signed-in account menu links to one noindex cross-game Profile page',()=>{
  const home=read('dist/index.html'),profile=read('dist/profile/index.html');
  assert.match(home,/class="account-menu-link" href="\/profile\/">Profile<\/a>/);
  assert.match(profile,/<title>Your Profile \| Snapoki<\/title>/);
  assert.match(profile,/name="robots" content="noindex,follow"/);
  assert.match(profile,/id="accountProfile"/);
  assert.match(profile,/src="\/assets\/js\/profile-page\.js"/);
  assert.match(profile,/href="\/assets\/styles\/account-profile\.css"/);
  assert.doesNotMatch(read('dist/sitemap.xml'),/<loc>https:\/\/snapoki\.com\/profile\/<\/loc>/);
});

test('Profile aggregates bounded per-game state in one D1 query',()=>{
  const api=read('functions/api/profile.js'),client=read('src/js/profile-page.js'),migration=read('migrations/0005_free_tier_scalability.sql');
  assert.match(api,/SELECT \* FROM user_game_stats WHERE user_id=\? ORDER BY game/);
  assert.match(api,/allGamePayload/);
  assert.doesNotMatch(api,/\bFROM results\b|\bJOIN results\b/);
  assert.match(client,/api\('\/api\/profile'\)/);
  assert.doesNotMatch(client,/\/api\/profile\?game=/);
  assert.match(client,/GAMES\.map\(game=>gameCard/);
  assert.match(migration,/PRIMARY KEY \(user_id, game\)/);
});
