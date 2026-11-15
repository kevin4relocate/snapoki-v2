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
    assert.match(html,/\/assets\/r\/[a-f0-9]{20}\/styles\/content\.css/,`${rel}: missing content.css`);
    assert.match(html,/\/assets\/r\/[a-f0-9]{20}\/styles\/launch\.css/,`${rel}: missing launch.css`);
  }
});

test('release shell keeps header footer and content pages inside one 1280px boundary',()=>{
  const css=fs.readFileSync(path.join(dist,'assets','styles','launch.css'),'utf8');
  assert.match(css,/--site-shell-max:1280px/);
  assert.match(css,/\.site-header-inner,\.footer-inner,\.footer-bottom\{max-width:var\(--site-shell-max\)\}/);
  assert.match(css,/\.content-page\{width:100%;max-width:var\(--site-shell-max\);margin-left:auto;margin-right:auto;padding-left:var\(--site-shell-gutter\);padding-right:var\(--site-shell-gutter\)\}/);
  assert.doesNotMatch(css,/100vw/);
});

test('all guide detail visual and prose content uses the shared 1080px measure',()=>{
  const css=fs.readFileSync(path.join(dist,'assets','styles','launch.css'),'utf8');
  assert.match(css,/--content-max:1080px/);
  assert.doesNotMatch(css,/--guide-visual-max|--reading-max|--reference-max|--blog-summary-max/);
  assert.match(css,/\.guide-page \.breadcrumbs,\.guide-page \.content-hero,\.guide-page article\{width:100%;max-width:var\(--content-max\);margin-left:auto;margin-right:auto\}/);
  assert.match(css,/\.guide-page article>h2,[^\n]*max-width:var\(--content-max\)/);
  assert.match(css,/\.guide-figure\{width:100%;max-width:100%/);
  assert.match(css,/\.article-cta\{[^\n]*width:100%;max-width:100%/);
});

test('guide hub uses centered responsive vertical cards for any future game count',()=>{
  const css=fs.readFileSync(path.join(dist,'assets','styles','launch.css'),'utf8');
  const blog=fs.readFileSync(path.join(dist,'blog','index.html'),'utf8');
  assert.match(css,/\.guide-grid\{display:flex;flex-wrap:wrap;justify-content:center;align-items:stretch/);
  assert.match(css,/\.guide-card\{flex:0 1 calc\(\(100% - 36px\)\/3\);[^\n]*display:flex;flex-direction:column/);
  assert.match(css,/\.guide-card>img\{[^\n]*aspect-ratio:9\/5/);
  assert.match(css,/@media\(max-width:1040px\)[\s\S]*\.guide-card\{flex-basis:calc\(\(100% - 18px\)\/2\)\}/);
  assert.match(css,/@media\(max-width:620px\)[\s\S]*\.guide-card\{flex-basis:100%/);
  assert.ok((blog.match(/class="guide-card"/g)||[]).length>=5,'guide hub should contain all current game cards');
});
