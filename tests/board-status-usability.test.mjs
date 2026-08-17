import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=()=>fs.readFileSync('dist/assets/js/game-page.js','utf8');

test('Maze and Number Path suppress duplicate static instructions below the board',()=>{
  const js=page();
  assert.match(js,/gameKey==='maze'&&text==='Reach the green finish\. Hard boards hide the correct route behind deeper branch traps and tighter decisions\.'/);
  assert.match(js,/gameKey==='number-path'&&text==='Start at 1\. Checkpoints must match their exact path step\. Regular Play allows contradictions so you can reason, notice them and Undo yourself\.'/);
  assert.match(js,/text='';const progress=/);
});

test('Number Path live progress becomes a compact highlighted HUD',()=>{
  const js=page(),css=fs.readFileSync('dist/assets/styles/board-status.css','utf8');
  assert.match(js,/text\.match\(\/\^Step \(\\d\+\) of \(\\d\+\)\\\. Next checkpoint: \(\\d\+\)\\\.\$\//);
  assert.match(js,/class=\"board-progress-step\"/);
  assert.match(js,/class=\"board-progress-next\"/);
  assert.match(js,/e\.classList\.toggle\('is-progress',Boolean\(progress\)\)/);
  assert.match(css,/\.board-feedback\.is-progress/);
  assert.match(css,/\.board-progress-next/);
  assert.match(css,/border-radius:999px/);
});

test('every game page loads the shared board status stylesheet',()=>{
  for(const slug of ['echo-step','maze','number-path','color-connect','lights-out','loop-puzzle']){
    const html=fs.readFileSync(`dist/${slug}/index.html`,'utf8');
    assert.match(html,/\/assets\/styles\/board-status\.css/,`${slug} should load board-status.css`);
  }
});
