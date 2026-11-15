import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {GAMES} from '../src/js/games-config.js';

const dist='dist';
const release=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function walk(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())files.push(...walk(file));
    else files.push(file);
  }
  return files;
}

test('release manifest is content-addressed and stable for the JS/CSS graph',()=>{
  assert.match(release.releaseId,/^[a-f0-9]{20}$/);
  assert.equal(release.assetsBase,`/assets/r/${release.releaseId}/`);
  const paths=Object.keys(release.assets).sort();
  assert.ok(paths.length>30,'Expected complete game and social module graph');
  const digest=createHash('sha256');
  for(const name of paths){
    assert.match(name,/^(js|styles)\/.+\.(js|css)$/);
    const current=fs.readFileSync(path.join(dist,'assets',name));
    const versioned=fs.readFileSync(path.join(dist,'assets','r',release.releaseId,name));
    const actual=sha(current);
    assert.equal(sha(versioned),actual,`Stale release asset ${name}`);
    assert.equal(release.assets[name].sha256,actual,`Incorrect manifest hash ${name}`);
    assert.equal(release.assets[name].bytes,current.length,`Incorrect size ${name}`);
    digest.update(name);digest.update('\0');digest.update(actual);digest.update('\n');
  }
  assert.equal(digest.digest('hex').slice(0,20),release.releaseId);
});

test('public and private HTML pages load only immutable release asset URLs',()=>{
  const pages=walk(dist).filter(f=>f.endsWith('.html'));
  assert.ok(pages.length>=GAMES.length+6);
  let total=0;
  for(const file of pages){
    const html=fs.readFileSync(file,'utf8');
    const refs=[...html.matchAll(/\/assets\/r\/([a-f0-9]{20})\/(js|styles)\/([a-z0-9_./-]+\.(?:js|css))/gi)];
    assert.ok(refs.length>=2,`${file}: missing versioned JS/CSS`);
    assert.doesNotMatch(html,/\/assets\/(?:js|styles)\/[a-z0-9_./-]+\.(?:js|css)/i,`${file}: stale asset URL`);
    for(const ref of refs){
      assert.equal(ref[1],release.releaseId,`${file}: mixed release fingerprints`);
      assert.ok(Object.hasOwn(release.assets,`${ref[2]}/${ref[3]}`),`${file}: unknown asset ${ref[0]}`);
      total++;
    }
  }
  assert.equal(total,release.referenceCount);
});

test('module imports stay relative to the versioned release graph',()=>{
  for(const name of ['js/site.js','js/game-page.js','js/social-game-board.js']){
    const code=fs.readFileSync(path.join(dist,'assets','r',release.releaseId,name),'utf8');
    assert.doesNotMatch(code,/import\(`\/assets\/js\//,'absolute engine import would mix JS releases');
  }
  assert.match(fs.readFileSync(path.join(dist,'assets','r',release.releaseId,'js/game-page.js'),'utf8'),/import\(`\.\/games\//);
});

test('Cloudflare immutable caches only the fingerprinted path; release marker is fresh',()=>{
  const headers=fs.readFileSync(path.join(dist,'_headers'),'utf8');
  assert.match(headers,/\/assets\/r\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  assert.match(headers,/\/release\.json\n\s+Cache-Control: no-store/);
  assert.match(headers,/\/assets\/js\/\*\n\s+Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers,/\/assets\/styles\/\*\n\s+Cache-Control: public, max-age=0, must-revalidate/);
});
