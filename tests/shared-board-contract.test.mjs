import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFile(path.join(root,rel),'utf8');

test('all Snapoki game boards share one centered geometry contract',async()=>{
  const css=await read('src/styles/board-contract.css');
  assert.match(css,/--board-square-max:560px/);
  assert.match(css,/--board-stage-max:580px/);
  for(const selector of ['.number-grid','.color-board-wrap','.lights-grid','.maze-stage','.loop-wrap','.echo-board-shell','.bridges-board-wrap'])assert.ok(css.includes(selector),`${selector} must use the shared board contract`);
  assert.match(css,/\.number-grid,\.color-board-wrap,\.lights-grid,\.loop-wrap,\.echo-board-shell,\.bridges-board-wrap\{width:min\(100%,var\(--board-square-max\)\);aspect-ratio:1\/1/);
  assert.match(css,/\.maze-stage\{width:min\(100%,var\(--board-stage-max\)\)/);
  assert.match(css,/\.echo-stage\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*justify-items:center/);
  assert.match(css,/\.echo-stage>\*\{min-width:0;max-width:100%\}/);
  assert.match(css,/\.echo-board-shell>\.echo-grid\{width:100%;height:100%;max-width:none;aspect-ratio:auto;margin:0\}/);
});

test('Loop Puzzle and Bridges use the same 560px square board contract as the other square games',async()=>{
  const css=await read('src/styles/board-contract.css');
  assert.match(css,/\.number-grid,\.color-board-wrap,\.lights-grid,\.loop-wrap,\.echo-board-shell,\.bridges-board-wrap/);
  assert.doesNotMatch(css,/\.maze-stage,\.loop-wrap/);
});

test('Echo Step keeps the shared 560px square instead of shrinking by viewport height',async()=>{
  const css=await read('src/styles/board-contract.css');
  assert.match(css,/--echo-square-max:var\(--board-square-max\)/);
  assert.match(css,/\.echo-stage>\.echo-board-shell\{width:min\(100%,var\(--echo-square-max\)\);aspect-ratio:1\/1;margin-inline:auto\}/);
  assert.doesNotMatch(css,/100dvh|clamp\(400px|clamp\(500px/);
});

test('Echo chrome cannot widen the grid track or pull the square board off center',async()=>{
  const css=await read('src/styles/board-contract.css'),rules=await read('src/styles/echo-step-rulebar.css');
  assert.match(css,/\.echo-compact-bar\{overflow:visible;justify-content:center\}/);
  assert.doesNotMatch(css,/overflow-x:auto/);
  assert.match(rules,/grid-template-areas:"you arrow echo goal" "rules rules rules rules"/);
  assert.match(rules,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.echo-stage>\.echo-state-banner\{[^}]*left:50%;right:auto[^}]*width:min\(100%,var\(--echo-square-max\)\)[^}]*transform:translateX\(-50%\)/);
});

test('every built game page loads the shared board contract last',async()=>{
  for(const game of GAMES){
    const html=await read(`dist/${game.slug}/index.html`);
    const contract=html.lastIndexOf('/assets/styles/board-contract.css');
    assert.ok(contract>=0,`${game.slug} must load board-contract.css`);
    assert.ok(contract>html.lastIndexOf('/assets/styles/games.css'),`${game.slug} board contract must load after games.css`);
    if(game.key==='echo-step'){
      assert.ok(contract>html.lastIndexOf('/assets/styles/echo-step-rulebar.css'),'Echo contract must load after Echo-specific geometry overrides');
    }
  }
});
