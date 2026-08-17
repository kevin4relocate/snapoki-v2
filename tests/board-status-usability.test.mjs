import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES} from '../src/js/games-config.js';
import {presentGameStatus} from '../src/js/game-status.js';

test('Maze and Number Path suppress duplicate static instructions below the board',()=>{
  assert.equal(presentGameStatus('maze','Reach the green finish. Hard boards hide the correct route behind deeper branch traps and tighter decisions.').hidden,true);
  assert.equal(presentGameStatus('number-path','Start at 1. Checkpoints must match their exact path step. Regular Play allows contradictions so you can reason, notice them and Undo yourself.').hidden,true);
  const source=fs.readFileSync('src/js/game-status.js','utf8');
  assert.match(source,/const INITIAL_STATUS=/);
  assert.match(source,/INITIAL_STATUS\[gameKey\]===text/);
});

test('Number Path live progress becomes a compact highlighted HUD',()=>{
  const view=presentGameStatus('number-path','Step 2 of 36. Next checkpoint: 8.');
  const css=fs.readFileSync('dist/assets/styles/board-status.css','utf8');
  assert.equal(view.hidden,false);
  assert.equal(view.type,'progress');
  assert.match(view.html,/board-progress-step/);
  assert.match(view.html,/Step <b>2<\/b> \/ 36/);
  assert.match(view.html,/board-progress-next/);
  assert.match(view.html,/Next checkpoint <b>8<\/b>/);
  assert.match(css,/\.board-feedback\.is-progress/);
  assert.match(css,/\.board-progress-next/);
  assert.match(css,/border-radius:999px/);
});

test('shared game runtime delegates status rendering to game-status instead of inline per-game patches',()=>{
  const page=fs.readFileSync('src/js/game-page.js','utf8');
  assert.match(page,/import \{renderGameStatus\} from '\.\/game-status\.js'/);
  assert.match(page,/function setStatus\(t\)\{renderGameStatus\(\$\('#gameStatus'\),gameKey,t\);\}/);
  assert.doesNotMatch(page,/gameKey==='maze'&&text===/);
});

test('every game page loads the shared board status stylesheet',()=>{
  for(const game of GAMES){
    const html=fs.readFileSync(`dist/${game.slug}/index.html`,'utf8');
    assert.match(html,/\/assets\/styles\/board-status\.css/,`${game.slug} should load board-status.css`);
  }
});
