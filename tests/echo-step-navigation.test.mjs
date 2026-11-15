import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES} from '../src/js/games-config.js';

test('Echo Step is public in header, footer, homepage and Guides',()=>{
  assert.equal(GAMES[0].key,'echo-step');
  const home=fs.readFileSync('dist/index.html','utf8');
  assert.match(home,/class="desktop-game-link" data-game-link="echo-step" href="\/echo-step\/">Echo Step<\/a>/);
  assert.match(home,/class="game-card" href="\/echo-step\/"/);
  assert.match(home,/data-game-spotlight="echo-step"/);
  assert.match(home,new RegExp(`${GAMES.length} games\\.<br><span>Endless challenges\\.<\\/span>`));
  assert.match(home,/<strong>Games<\/strong><a href="\/echo-step\/">Echo Step<\/a>/);

  const blog=fs.readFileSync('dist/blog/index.html','utf8');
  assert.match(blog,/href="\/blog\/how-to-play-echo-step\/"/);
  assert.match(blog,/How to Play Echo Step/);
  for(const game of GAMES)assert.match(blog,new RegExp(`How to Play ${game.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
});

test('Echo Step and its guide are indexable launch routes with shared How to Play styles',()=>{
  const html=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(html,/data-game="echo-step"/);
  assert.match(html,/\/assets\/r\/[a-f0-9]{20}\/styles\/echo-step\.css/);
  assert.match(html,/\/assets\/r\/[a-f0-9]{20}\/styles\/how-to-card\.css/);
  assert.ok(fs.existsSync('dist/assets/styles/how-to-card.css'));
  assert.equal(fs.existsSync('dist/assets/styles/echo-step-launch.css'),false);
  assert.ok(fs.existsSync('dist/blog/how-to-play-echo-step/index.html'));
  const headers=fs.readFileSync('dist/_headers','utf8');
  assert.doesNotMatch(headers,/\/echo-step\/\*[\s\S]*X-Robots-Tag: noindex/i);
  assert.doesNotMatch(headers,/\/blog\/how-to-play-echo-step\/\*[\s\S]*X-Robots-Tag: noindex/i);
});
