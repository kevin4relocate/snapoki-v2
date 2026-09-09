import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('public pages are guest-only with no account or Profile surface',()=>{
  const home=read('dist/index.html');
  assert.doesNotMatch(home,/id="loginButton"|id="loginModal"|id="accountSlot"|href="\/profile\//);
  assert.equal(fs.existsSync(path.join(root,'dist/profile/index.html')),false);
  for(const game of GAMES){
    const html=read(`dist/${game.slug}/index.html`);
    assert.doesNotMatch(html,/class="panel profile"|id="profileBody"|class="panel rankings"|id="rankingList"/);
    assert.match(html,/class="panel how-to"/);
    assert.match(html,/class="section daily-section"/);
  }
});

test('Daily state is browser-local and does not require account hydration',()=>{
  const runtime=read('src/js/game-page.js');
  assert.match(runtime,/snapoki:daily:v1:/);
  assert.match(runtime,/localStorage\.getItem/);
  assert.match(runtime,/localStorage\.setItem/);
  assert.match(runtime,/loadLocalDailyProgress/);
  assert.match(runtime,/markLocalDailyComplete/);
});

test('Google account creation endpoint is disabled',()=>{
  const auth=read('functions/api/auth/google.js');
  const config=read('functions/api/config.js');
  assert.match(auth,/ACCOUNTS_DISABLED/);
  assert.match(auth,/Accounts are not available on Snapoki/);
  assert.match(config,/accountsEnabled:\s*false/);
  assert.match(config,/googleClientId:\s*''/);
});
