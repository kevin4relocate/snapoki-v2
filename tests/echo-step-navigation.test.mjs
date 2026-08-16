import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {GAMES} from '../src/js/games-config.js';

function walk(dir){const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(full));else out.push(full);}return out;}

test('Echo Step stays first in the registry but is hidden from every public navigation surface during staging',()=>{
  assert.equal(GAMES[0].key,'echo-step');
  const htmlFiles=walk('dist').filter(file=>file.endsWith('.html'));
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(html,/href="\/echo-step\/"/,`${file}: Echo Step game link must stay hidden`);
    assert.doesNotMatch(html,/href="\/blog\/how-to-play-echo-step\/"/,`${file}: Echo Step guide link must stay hidden`);
  }
  const home=fs.readFileSync('dist/index.html','utf8');
  assert.doesNotMatch(home,/data-game-link="echo-step"/);
  assert.doesNotMatch(home,/class="game-card" href="\/echo-step\/"/);
  assert.match(home,/class="desktop-game-link" data-game-link="maze"/);
  assert.match(home,/class="desktop-game-link" data-game-link="lights-out"/);
  const more=home.slice(home.indexOf('id="gamesMenu"'),home.indexOf('</div></div></nav>',home.indexOf('id="gamesMenu"')));
  assert.match(more,/Loop Puzzle/);
  assert.doesNotMatch(more,/Echo Step|Lights Out/);
});

test('Echo Step direct test route remains built with dedicated styles and staging noindex headers',()=>{
  const html=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(html,/data-game="echo-step"/);
  assert.match(html,/\/assets\/styles\/echo-step\.css/);
  assert.ok(fs.existsSync('dist/assets/styles/echo-step.css'));
  const headers=fs.readFileSync('dist/_headers','utf8');
  assert.match(headers,/\/echo-step\/\*[\s\S]*X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.match(headers,/\/blog\/how-to-play-echo-step\/\*[\s\S]*X-Robots-Tag: noindex, nofollow, noarchive/);
});
