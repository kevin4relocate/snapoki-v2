import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('ranking multiplier labels stay compact and never inherit default em typography',()=>{
  const css=read('src/styles/polish-v3.css');
  assert.match(css,/\.difficulty-reward\{[^}]*font-size:9px!important[^}]*font-style:normal[^}]*white-space:nowrap/);
  assert.match(css,/\.daily-reward\{[^}]*font-size:9px!important[^}]*font-style:normal[^}]*white-space:nowrap/);
  const page=read('src/js/game-page.js');
  assert.match(page,/className='difficulty-reward'/);
  assert.match(page,/className='daily-reward'/);
});

test('blog hub uses the full shared site shell while article prose remains readable',()=>{
  const css=read('src/styles/launch.css');
  assert.match(css,/\.blog-index \.breadcrumbs,\.blog-index \.content-hero,\.blog-index \.guide-grid,\.blog-index>article\{width:100%;max-width:var\(--site-shell-max\)/);
  assert.match(css,/--reading-max:900px/);
  assert.match(css,/\.article-cta \.button\{flex:0 0 auto;white-space:nowrap\}/);
});

test('More Games visually contains only game names',()=>{
  const css=read('src/styles/polish-v3.css');
  assert.match(css,/\.games-dropdown a small\{display:none!important\}/);
  const html=read('dist/index.html');
  const start=html.indexOf('id="gamesMenu"');
  const end=html.indexOf('</div>',start);
  const menu=html.slice(start,end);
  assert.match(menu,/Loop Puzzle/);
});
