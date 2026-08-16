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

test('blog hub uses the full shared shell and gives its editorial summary a wider centered measure',()=>{
  const css=read('src/styles/launch.css');
  assert.match(css,/--blog-summary-max:1080px/);
  assert.match(css,/\.blog-index \.breadcrumbs,\.blog-index \.content-hero,\.blog-index \.guide-grid\{width:100%;max-width:var\(--site-shell-max\)/);
  assert.match(css,/\.blog-index>article\{width:100%;max-width:var\(--blog-summary-max\);margin-left:auto;margin-right:auto\}/);
  assert.match(css,/\.article-cta \.button\{flex:0 0 auto;white-space:nowrap\}/);
});

test('all static and reference content pages share the same centered reading width',()=>{
  const css=read('src/styles/launch.css');
  assert.match(css,/--reference-max:980px/);
  assert.match(css,/\.content-shell \.content-page \.content-hero,\.content-shell \.content-page article\{width:100%;max-width:var\(--reference-max\);margin-left:auto;margin-right:auto\}/);
  for(const route of ['about','help','privacy','terms','how-to-play','daily-challenges','rankings-guide']){
    const html=read(`dist/${route}/index.html`);
    assert.match(html,/<body class="content-shell"/);
    assert.ok(html.indexOf('/assets/styles/content.css')<html.indexOf('/assets/styles/launch.css'),`${route}: content.css must load before launch.css`);
  }
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
