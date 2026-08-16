import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(f));else out.push(f);}return out;}
function isPrivateUtility(file){return fs.readFileSync(file,'utf8').includes('data-private-utility="true"');}

test('Google Analytics is installed exactly once on every public built HTML page',()=>{
  for(const file of walk(dist).filter(f=>f.endsWith('.html')&&!isPrivateUtility(f))){
    const html=fs.readFileSync(file,'utf8'),rel=path.relative(dist,file);
    assert.equal((html.match(/googletagmanager\.com\/gtag\/js\?id=G-ED1P696TW8/g)||[]).length,1,`${rel}: GA loader`);
    assert.equal((html.match(/gtag\('config', 'G-ED1P696TW8'\)/g)||[]).length,1,`${rel}: GA config`);
  }
  const desk=read('dist/snapdesk-74kq/index.html');
  assert.doesNotMatch(desk,/googletagmanager\.com\/gtag\/js/,'private content desk should not load public analytics');
});

test('homepage FAQ uses the shared 1080px measure and covers launch questions',()=>{
  const html=read('dist/index.html'),css=read('dist/assets/styles/launch.css');
  const faq=(html.match(/<section class="section faq">([\s\S]*?)<\/section>/)||[])[1]||'';
  assert.equal((faq.match(/<details>/g)||[]).length,6);
  for(const text of ['Is Snapoki free?','Do I need an account?','What is a Daily Challenge?','How does difficulty work?','How do Rankings work?','What happens when I use Solution?'])assert.ok(faq.includes(text),`missing FAQ: ${text}`);
  assert.match(faq,/href="\/daily-challenges\/"/);
  assert.match(faq,/href="\/rankings-guide\/"/);
  assert.match(css,/\.home-page \.faq\{width:100%;max-width:calc\(var\(--content-max\) \+ \(var\(--site-shell-gutter\) \* 2\)\);margin-left:auto;margin-right:auto\}/);
});

test('public footers expose LinkedIn, Instagram, X and Facebook PlaySnapoki destinations without a Sitemap link',()=>{
  for(const file of walk(dist).filter(f=>f.endsWith('.html')&&!isPrivateUtility(f))){
    const html=fs.readFileSync(file,'utf8'),rel=path.relative(dist,file);
    assert.match(html,/class="footer-social"/,`${rel}: social group`);
    assert.match(html,/https:\/\/www\.linkedin\.com\/company\/snapoki\//,`${rel}: LinkedIn`);
    assert.match(html,/https:\/\/www\.instagram\.com\/playsnapoki\//,`${rel}: Instagram`);
    assert.match(html,/https:\/\/x\.com\/playsnapoki/,`${rel}: X`);
    assert.match(html,/https:\/\/www\.facebook\.com\/playsnapoki/,`${rel}: Facebook`);
    assert.doesNotMatch(html,/href="\/sitemap\.xml">Sitemap<\/a>/,`${rel}: visible Sitemap footer link`);
  }
  assert.ok(fs.existsSync('dist/sitemap.xml'),'technical sitemap must remain generated for search engines');
});

test('analytics disclosure and social identity metadata match PlaySnapoki launch configuration',()=>{
  const privacy=read('dist/privacy/index.html');
  assert.match(privacy,/<h2>Analytics<\/h2>/);
  assert.match(privacy,/Snapoki uses Google Analytics/);
  assert.match(privacy,/Google Analytics may also use first-party cookies/);
  const home=read('dist/index.html');
  assert.match(home,/name="twitter:site" content="@playsnapoki"/);
  assert.match(home,/property="og:image:alt" content="Snapoki puzzle games"/);
  const blocks=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const org=blocks.find(x=>x['@type']==='Organization');
  assert.ok(org,'homepage Organization schema');
  assert.deepEqual(org.sameAs,['https://www.linkedin.com/company/snapoki/','https://www.instagram.com/playsnapoki/','https://x.com/playsnapoki','https://www.facebook.com/playsnapoki']);
  assert.equal('email' in org,false,'Organization schema should not reintroduce contact email globally');
});
