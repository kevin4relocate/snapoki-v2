import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES,FEATURED_GAMES} from '../src/js/games-config.js';

test('Echo Step is the first Snapoki game and first desktop game before Maze',()=>{
  assert.equal(GAMES[0].key,'echo-step');
  assert.equal(FEATURED_GAMES[0].key,'echo-step');
  assert.equal(FEATURED_GAMES[1].key,'maze');
  const html=fs.readFileSync('dist/index.html','utf8');
  const echoNav=html.indexOf('data-game-link="echo-step"'),mazeNav=html.indexOf('data-game-link="maze"');
  assert.ok(echoNav>=0&&mazeNav>echoNav,'Echo Step must appear before Maze in the header');
  const gamesStart=html.indexOf('class="game-card-grid"'),echoCard=html.indexOf('href="/echo-step/"',gamesStart),mazeCard=html.indexOf('href="/maze/"',gamesStart);
  assert.ok(echoCard>=0&&mazeCard>echoCard,'Echo Step must be the first game card before Maze');
  assert.match(html,/href="\/echo-step\/">Play a Game<\/a>/);
});

test('Echo Step build loads its dedicated responsive board styles',()=>{
  const html=fs.readFileSync('dist/echo-step/index.html','utf8');
  assert.match(html,/\/assets\/styles\/echo-step\.css/);
  assert.ok(fs.existsSync('dist/assets/styles/echo-step.css'));
});
