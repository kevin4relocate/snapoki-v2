import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES} from '../src/js/games-config.js';

test('Echo Step is public in header, footer, homepage and Guides',()=>{
  assert.equal(GAMES[0].key,'echo-step');
  const home=fs.readFileSync('dist/index.html','utf8');
  assert.match(home,/class="desktop-game-link" data-game-link="echo-step" href="\/echo-step\/">Echo Step<\/a>/);
  assert.match(home,/class="game-card" href="\/echo-step\/"/);
  assert.match(home,/data-echo-step-spotlight/);
  assert.match(home,/Six puzzles\.<br><span>Endless challenges\.<\/span>/);
  assert.match(home,/<strong>Games<\/strong><a href="\/echo-step\/">Echo Step<\/a>/);

  const blog=fs.readFileSync('dist/blog/index.html','utf8');
  assert.match(blog,/href="\/blog\/how-to-play-echo-step\/"/);
  assert.match(blog,/How to Play Echo Step/);
  assert.match(blog,/Echo Step, Maze, Number Path, Color Connect, Lights Out and Loop Puzzle/);
});

test('Echo Step and its guide are indexable launch routes with dedicated styles',()=>{
  const html=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(html,/data-game="echo-step"/);
  assert.match(html,/\/assets\/styles\/echo-step\.css/);
  assert.match(html,/\/assets\/styles\/echo-step-launch\.css/);
  assert.ok(fs.existsSync('dist/assets/styles/echo-step-launch.css'));
  assert.ok(fs.existsSync('dist/blog/how-to-play-echo-step/index.html'));
  const headers=fs.readFileSync('dist/_headers','utf8');
  assert.doesNotMatch(headers,/\/echo-step\/\*[\s\S]*X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.doesNotMatch(headers,/\/blog\/how-to-play-echo-step\/\*[\s\S]*X-Robots-Tag: noindex, nofollow, noarchive/);
});
