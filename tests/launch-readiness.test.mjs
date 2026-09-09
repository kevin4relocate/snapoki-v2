import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const siteUrl='https://snapoki.com';
const contentRoutes=['about','help','privacy','terms','how-to-play','daily-challenges'];
const contactRoutes=new Set(['help','privacy','terms']);
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function walk(dir){const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(full));else out.push(full);}return out;}
function body(html){return (html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||'';}
function canonical(html){return (html.match(/<link rel="canonical" href="([^"]+)"/i)||[])[1]||'';}
function title(html){return (html.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'';}
function description(html){return (html.match(/<meta name="description" content="([^"]*)"/i)||[])[1]||'';}
function indexableHtml(){return walk(dist).filter(file=>file.endsWith('.html')&&!file.endsWith(`${path.sep}404.html`)).filter(file=>! /name="robots" content="noindex/i.test(fs.readFileSync(file,'utf8')));}
function localTargetExists(raw){
  if(!raw||raw.startsWith('#')||/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(raw))return true;
  if(!raw.startsWith('/'))return true;
  const clean=raw.split('#')[0].split('?')[0]||'/';
  if(clean==='/')return fs.existsSync(path.join(dist,'index.html'));
  const rel=decodeURIComponent(clean.replace(/^\//,''));
  const direct=path.join(dist,rel);
  if(fs.existsSync(direct)&&fs.statSync(direct).isFile())return true;
  if(fs.existsSync(path.join(direct,'index.html')))return true;
  return false;
}

test('launch build has the complete scalable route set',()=>{
  const expected=1+GAMES.length+contentRoutes.length+1+GAMES.length;
  const pages=indexableHtml();
  assert.equal(pages.length,expected,`expected ${expected} indexable pages`);
  for(const g of GAMES){
    assert.ok(fs.existsSync(path.join(dist,g.slug,'index.html')),`missing game page ${g.slug}`);
    assert.ok(fs.existsSync(path.join(dist,'blog',`how-to-play-${g.slug}`,'index.html')),`missing guide ${g.slug}`);
    assert.ok(fs.existsSync(path.join(dist,'brand','guides',`${g.slug}.svg`)),`missing guide illustration ${g.slug}`);
  }
  for(const route of [...contentRoutes,'blog'])assert.ok(fs.existsSync(path.join(dist,route,'index.html')),`missing ${route}`);
});

test('every indexable page has unique canonical metadata and one H1',()=>{
  const pages=indexableHtml(),canonicals=new Set(),titles=new Set();
  for(const file of pages){
    const html=fs.readFileSync(file,'utf8'),rel=path.relative(dist,file);
    assert.match(html,/^<!doctype html>/i,`${rel}: doctype`);
    assert.match(html,/<html lang="en">/i,`${rel}: lang`);
    const c=canonical(html),t=title(html),d=description(html);
    assert.ok(c.startsWith(`${siteUrl}/`),`${rel}: canonical must use snapoki.com`);
    assert.equal(canonicals.has(c),false,`${rel}: duplicate canonical ${c}`);canonicals.add(c);
    assert.ok(t.length>=12&&t.length<=85,`${rel}: title length ${t.length}`);
    assert.equal(titles.has(t),false,`${rel}: duplicate title ${t}`);titles.add(t);
    assert.ok(d.length>=50&&d.length<=200,`${rel}: description length ${d.length}`);
    assert.match(html,/name="robots" content="index,follow,max-image-preview:large"/i,`${rel}: robots meta`);
    assert.match(html,/property="og:image" content="https:\/\/snapoki\.com\/brand\/social-card\.png"/i,`${rel}: og image`);
    assert.match(html,/name="twitter:card" content="summary_large_image"/i,`${rel}: twitter card`);
    assert.equal((html.match(/<h1\b/gi)||[]).length,1,`${rel}: must have exactly one h1`);
    assert.doesNotMatch(html,/snapoki-v2\.pages\.dev|localhost|127\.0\.0\.1|Lorem ipsum|\bTODO\b/i,`${rel}: launch placeholder/internal host`);
  }
});

test('sitemap is an exact projection of indexable canonicals',()=>{
  const canonicalSet=new Set(indexableHtml().map(file=>canonical(fs.readFileSync(file,'utf8'))));
  const sitemap=read('dist/sitemap.xml');
  const sitemapSet=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]));
  assert.equal(sitemapSet.size,canonicalSet.size);
  assert.deepEqual([...sitemapSet].sort(),[...canonicalSet].sort());
  assert.match(read('dist/robots.txt'),/^User-agent: \*\nAllow: \/\nDisallow: \/api\/\nDisallow: \/cdn-cgi\//);
  assert.match(read('dist/robots.txt'),/Sitemap: https:\/\/snapoki\.com\/sitemap\.xml/);
});

test('structured pages have valid JSON-LD using only the public domain',()=>{
  for(const file of indexableHtml()){
    const html=fs.readFileSync(file,'utf8'),rel=path.relative(dist,file).replaceAll('\\','/');
    const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    const required=rel==='index.html'||rel.startsWith('blog/')||GAMES.some(g=>rel===`${g.slug}/index.html`);
    if(required)assert.ok(blocks.length>=1,`${rel}: missing JSON-LD`);
    for(const block of blocks){
      let data;assert.doesNotThrow(()=>{data=JSON.parse(block[1]);},`${rel}: invalid JSON-LD`);
      const serialized=JSON.stringify(data);
      assert.doesNotMatch(serialized,/pages\.dev|localhost|127\.0\.0\.1/i,`${rel}: JSON-LD host`);
    }
  }
});

test('all root-relative href and src targets exist in the built site',()=>{
  const htmlFiles=walk(dist).filter(file=>file.endsWith('.html'));
  const failures=[];
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8'),rel=path.relative(dist,file);
    for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gi))if(!localTargetExists(match[1]))failures.push(`${rel} -> ${match[1]}`);
  }
  assert.deepEqual(failures,[]);
});

test('HTML ids are unique per page',()=>{
  for(const file of walk(dist).filter(file=>file.endsWith('.html'))){
    const html=fs.readFileSync(file,'utf8'),seen=new Set(),duplicates=[];
    for(const match of html.matchAll(/\bid="([^"]+)"/g)){if(seen.has(match[1]))duplicates.push(match[1]);seen.add(match[1]);}
    assert.deepEqual(duplicates,[],`${path.relative(dist,file)} duplicate ids`);
  }
});

test('brand, favicon, manifest and Cloudflare launch files are complete',()=>{
  for(const rel of ['dist/favicon.svg','dist/favicon-32.png','dist/apple-touch-icon.png','dist/manifest.webmanifest','dist/brand/logo-mark.svg','dist/brand/logo.svg','dist/brand/logo-mark-192.png','dist/brand/logo-mark-512.png','dist/brand/social-card.png','dist/_headers','dist/_routes.json'])assert.ok(fs.existsSync(path.join(root,rel)),`missing ${rel}`);
  const manifest=JSON.parse(read('dist/manifest.webmanifest'));
  assert.equal(manifest.name,'Snapoki');
  for(const icon of manifest.icons)assert.equal(localTargetExists(icon.src),true,`manifest icon missing ${icon.src}`);
  const headers=read('dist/_headers');
  for(const header of ['X-Content-Type-Options: nosniff','Referrer-Policy: strict-origin-when-cross-origin','X-Frame-Options: DENY','Cross-Origin-Opener-Policy: same-origin-allow-popups'])assert.match(headers,new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('404 is noindex and visible support email only appears on support/legal pages',()=>{
  const notFound=read('dist/404.html');
  assert.match(notFound,/name="robots" content="noindex,follow"/i);
  assert.match(notFound,/<h1>That path does not exist\.<\/h1>/);
  for(const file of indexableHtml()){
    const rel=path.relative(dist,file).replaceAll('\\','/'),top=rel==='index.html'?'':rel.split('/')[0],visible=body(fs.readFileSync(file,'utf8'));
    if(contactRoutes.has(top))assert.match(visible,/mailto:contact@snapoki\.com/,`${rel}: expected support contact`);
    else assert.doesNotMatch(visible,/contact@snapoki\.com/,`${rel}: contact should not be visible here`);
  }
});
