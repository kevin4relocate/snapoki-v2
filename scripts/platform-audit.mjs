import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';
import {RESULT_VERIFIERS} from '../functions/_lib/scoring.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const siteUrl='https://snapoki.com';
const failures=[];
const warnings=[];

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
function rel(file){return path.relative(dist,file).split(path.sep).join('/');}
function textOnly(html){return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z0-9#]+;/gi,' ').replace(/\s+/g,' ').trim();}
function countWords(html){const text=textOnly(html);return text?text.split(/\s+/).filter(Boolean).length:0;}
function captures(html,re){return [...html.matchAll(re)].map(match=>match[1]);}
function fail(message){failures.push(message);}
function warn(message){warnings.push(message);}
function routeTarget(raw){
  if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:')||raw.startsWith('data:'))return null;
  if(/^https?:\/\//i.test(raw))return null;
  const clean=raw.split('#')[0].split('?')[0];
  if(!clean||clean.startsWith('/api/')||clean.startsWith('/cdn-cgi/'))return null;
  if(!clean.startsWith('/'))return null;
  if(clean==='/')return path.join(dist,'index.html');
  const local=path.join(dist,clean.replace(/^\//,''));
  if(path.extname(clean))return local;
  return path.join(local,'index.html');
}
async function exists(file){try{await fs.access(file);return true;}catch{return false;}}

const files=await walk(dist);
const htmlFiles=files.filter(file=>file.endsWith('.html'));
const publicHtml=[];
const canonicals=new Map();

for(const file of htmlFiles){
  const html=await fs.readFile(file,'utf8');
  const name=rel(file);
  const isPrivate=html.includes('data-private-utility="true"');
  const is404=name==='404.html';
  const noindex=/name="robots" content="[^"]*noindex/i.test(html);
  const title=(html.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'';
  const description=(html.match(/<meta name="description" content="([^"]*)"/i)||[])[1]?.trim()||'';
  const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/i)||[])[1]||'';
  const h1Count=(html.match(/<h1\b/gi)||[]).length;

  if(!isPrivate&&!is404){
    publicHtml.push({file,name,html,noindex,canonical});
    if(!title)fail(`${name}: missing <title>`);
    if(!description)fail(`${name}: missing meta description`);
    if(description&&description.length<70)warn(`${name}: meta description is short (${description.length})`);
    if(description&&description.length>180)warn(`${name}: meta description is long (${description.length})`);
    if(!canonical)fail(`${name}: missing canonical`);
    else if(!canonical.startsWith(siteUrl))fail(`${name}: canonical is outside ${siteUrl}`);
    if(h1Count!==1)fail(`${name}: expected one H1, found ${h1Count}`);
    if(!noindex&&canonical){
      if(canonicals.has(canonical))fail(`${name}: duplicate canonical also used by ${canonicals.get(canonical)}`);
      else canonicals.set(canonical,name);
    }
    if(/href="\/snapdesk-74kq\//.test(html))fail(`${name}: public page links to private Content Desk`);
  }

  for(const raw of [...captures(html,/href="([^"]+)"/gi),...captures(html,/src="([^"]+)"/gi)]){
    const target=routeTarget(raw);if(!target)continue;
    if(!await exists(target))fail(`${name}: dead internal reference ${raw}`);
  }
}

const registeredKeys=new Set(GAMES.map(game=>game.key));
const verifierKeys=new Set(Object.keys(RESULT_VERIFIERS));
for(const game of GAMES){
  const page=path.join(dist,game.slug,'index.html');
  const guide=path.join(dist,'blog',`how-to-play-${game.slug}`,'index.html');
  const engine=path.join(dist,'assets','js','games',`${game.slug}.js`);
  if(!await exists(page))fail(`${game.key}: missing built game page`);
  if(!await exists(guide))fail(`${game.key}: missing dedicated guide page`);
  if(!await exists(engine))fail(`${game.key}: missing engine entry ${game.slug}.js`);
  if(!verifierKeys.has(game.key))fail(`${game.key}: missing server result verifier`);
  if(await exists(page)){
    const html=await fs.readFile(page,'utf8');
    if(!html.includes('class="game-howto '))fail(`${game.key}: missing shared How to Play component`);
    if(!html.includes('/assets/styles/how-to-card.css'))fail(`${game.key}: missing shared How to Play stylesheet`);
    if(!html.includes('/assets/styles/board-contract.css'))fail(`${game.key}: missing shared board contract`);
    if(!html.includes('/assets/styles/board-status.css'))fail(`${game.key}: missing shared board status styles`);
    if(!html.includes('class="section daily-section"'))fail(`${game.key}: missing Daily section`);
    if(/class="section game-seo"|class="section game-learn-more"/.test(html))fail(`${game.key}: game page contains editorial filler that belongs in the dedicated guide`);
  }
  if(await exists(guide)){
    const html=await fs.readFile(guide,'utf8');
    const words=countWords(html);
    if(words<420)fail(`${game.key}: guide content is too thin (${words} words)`);
    if(!html.includes(`href="/${game.slug}/"`))fail(`${game.key}: guide does not link back to the game`);
  }
}
for(const key of verifierKeys)if(!registeredKeys.has(key))fail(`${key}: server verifier has no matching game registry entry`);

const contentCssFile=path.join(dist,'assets','styles','content.css');
if(!await exists(contentCssFile))fail('shared content.css is missing');
else{
  const css=await fs.readFile(contentCssFile,'utf8');
  if(!/1080px/.test(css))fail('content.css does not use the shared 1080px editorial width');
  if(/max-width:\s*(?:760|820|980)px/.test(css))fail('content.css still contains an obsolete narrow editorial width');
}

const home=await fs.readFile(path.join(dist,'index.html'),'utf8');
const homeCards=(home.match(/class="game-card" href="\/[^"]+\/"/g)||[]).length;
if(homeCards<GAMES.length)fail(`homepage: expected at least ${GAMES.length} game cards, found ${homeCards}`);
if(/\bFive puzzles\b|all five puzzle games|All five puzzle games|Five distinct puzzle systems/i.test(home))fail('homepage: stale five-game copy remains');
if(/href="\/sitemap\.xml">Sitemap<\/a>/i.test(home))fail('homepage/footer: visible Sitemap link should stay hidden');

const sitemapFile=path.join(dist,'sitemap.xml');
if(!await exists(sitemapFile))fail('sitemap.xml is missing');
else{
  const sitemap=await fs.readFile(sitemapFile,'utf8');
  for(const [canonical,name] of canonicals){if(!sitemap.includes(`<loc>${canonical}</loc>`))fail(`${name}: canonical missing from sitemap`);}
  if(/snapdesk-74kq/.test(sitemap))fail('sitemap.xml exposes the private Content Desk');
}
const robotsFile=path.join(dist,'robots.txt');
if(!await exists(robotsFile))fail('robots.txt is missing');
else{
  const robots=await fs.readFile(robotsFile,'utf8');
  if(!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`))fail('robots.txt does not declare sitemap.xml');
  if(!robots.includes('Disallow: /api/'))fail('robots.txt does not exclude API routes');
  if(!robots.includes('Disallow: /snapdesk-74kq/'))fail('robots.txt does not exclude private Content Desk');
}

const adminPage=path.join(dist,'snapdesk-74kq','index.html');
if(!await exists(adminPage))fail('private Content Desk page is missing');
else{
  const html=await fs.readFile(adminPage,'utf8');
  if(!html.includes('data-private-utility="true"'))fail('Content Desk is not marked as a private utility');
  if(!/name="robots" content="noindex,nofollow,noarchive"/i.test(html))fail('Content Desk is missing noindex/nofollow/noarchive');
  if(!html.includes('id="generatorStatus"'))fail('Content Desk is missing Gemini/template status');
}
if(!await exists(path.join(root,'functions','api','snapdesk-74kq','content.js')))fail('Content Desk API route is missing');

const headers=await fs.readFile(path.join(dist,'_headers'),'utf8').catch(()=> '');
for(const game of GAMES){
  const route=`/${game.slug}/*`;
  const pos=headers.indexOf(route);
  if(pos>=0&&/X-Robots-Tag:\s*noindex/i.test(headers.slice(pos,pos+160)))fail(`${game.key}: launch route still receives X-Robots-Tag noindex`);
}

const packageJson=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
for(const obsolete of ['echo-step-integration.mjs','echo-launch-final.mjs','apply-board-contract.mjs','post-build-ui-safety.mjs'])if(String(packageJson.scripts?.build||'').includes(obsolete))fail(`build pipeline still references obsolete ${obsolete}`);


// Guest-only public product contract: no account, profile or leaderboard surfaces may ship.
for(const {name,html} of publicHtml){
  if(/id="loginButton"|id="loginModal"|id="accountSlot"|href="\/profile\/"|href="\/leaderboard\/"|href="\/rankings-guide\/"/i.test(html))fail(`${name}: public account or leaderboard surface is present`);
  if(/class="panel rankings"|id="rankingList"|class="panel profile"|id="profileBody"/i.test(html))fail(`${name}: game account/ranking rail is present`);
}
for(const retired of ['profile','leaderboard','rankings-guide']){
  if(await exists(path.join(dist,retired,'index.html')))fail(`${retired}: retired account/ranking route was generated`);
}
const publicSiteJs=await fs.readFile(path.join(dist,'assets','js','site.js'),'utf8').catch(()=> '');
if(/SnapokiAuth|google\.accounts|loginButton|\/api\/me|\/api\/auth\/google/.test(publicSiteJs))fail('site.js still contains public account bootstrap code');

if(warnings.length){console.warn(`Platform audit warnings (${warnings.length}):`);for(const item of warnings)console.warn(`  - ${item}`);}
if(failures.length){console.error(`Platform audit failed (${failures.length}):`);for(const item of failures)console.error(`  - ${item}`);process.exit(1);}
console.log(`Platform audit passed: ${GAMES.length} games, ${publicHtml.length} public HTML pages, ${canonicals.size} indexable canonicals, verifier parity and no dead internal links.`);
