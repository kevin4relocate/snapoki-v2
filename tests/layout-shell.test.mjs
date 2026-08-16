import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('all generated content pages load the shared content stylesheet',()=>{
  for(const file of walk(dist).filter(file=>file.endsWith('.html'))){
    const html=fs.readFileSync(file,'utf8');
    if(!html.includes('class="content-page'))continue;
    const rel=path.relative(dist,file);
    assert.match(html,/\/assets\/styles\/content\.css/,`${rel}: missing content.css`);
    assert.match(html,/\/assets\/styles\/launch\.css/,`${rel}: missing launch.css`);
  }
});

test('release shell keeps header footer and content pages inside one 1280px boundary',()=>{
  const css=fs.readFileSync(path.join(dist,'assets','styles','launch.css'),'utf8');
  assert.match(css,/--site-shell-max:1280px/);
  assert.match(css,/\.site-header-inner,\.footer-inner,\.footer-bottom\{max-width:var\(--site-shell-max\)\}/);
  assert.match(css,/\.content-page\{width:100%;max-width:var\(--site-shell-max\);margin-left:auto;margin-right:auto;padding-left:var\(--site-shell-gutter\);padding-right:var\(--site-shell-gutter\)\}/);
  assert.doesNotMatch(css,/100vw/);
});

test('guide pages keep wide visual blocks inside the shared shell while prose stays readable',()=>{
  const css=fs.readFileSync(path.join(dist,'assets','styles','launch.css'),'utf8');
  assert.match(css,/\.guide-page article\{max-width:none\}/);
  assert.match(css,/\.guide-page article>h2,[^\n]*max-width:900px/);
  assert.match(css,/\.guide-page \.guide-figure,[^\n]*max-width:100%/);
});
