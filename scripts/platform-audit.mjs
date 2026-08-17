import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

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
  return clean.endsWith('/')?path.join(local,'index.html'):path.join(local,'index.html');
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
  }

  for(const raw of [...captures(html,/href="([^"]+)"/gi),...captures(html,/src="([^"]+)"/gi)]){
    const target=routeTarget(raw);if(!target)continue;
    if(!await exists(target))fail(`${name}: dead internal reference ${raw}`);
  }
}

for(const game of GAMES){
  const page=path.join(dist,game.slug,'index.html');
  const guide=path.join(dist,'blog',`how-to-play-${game.slug}`,'index.html');
  const engine=path.join(dist,'assets','js','games',`${game.slug}.js`);
  if(!await exists(page))fail(`${game.key}: missing built game page`);
  if(!await exists(guide))fail(`${game.key}: missing dedicated guide page`);
  if(!await exists(engine))fail(`${game.key}: missing engine entry ${game.slug}.js`);
  if(await exists(page)){
    const html=await fs.readFile(page,'utf8');
    if(!html.includes('class="game-howto '))fail(`${game.key}: missing shared How to Play component`);
    if(!html.includes('/assets/styles/how-to-card.css'))fail(`${game.key}: missing shared How to Play stylesheet`);
    if(!html.includes('/assets/styles/board-contract.css'))fail(`${game.key}: missing shared board contract`);
    if(!html.includes('/assets/styles/board-status.css'))fail(`${game.key}: missing shared board status styles`);
    const words=countWords(html);
    if(words<220)fail(`${game.key}: game page content is too thin (${words} words)`);
  }
  if(await exists(guide)){
    const html=await fs.readFile(guide,'utf8');
    const words=countWords(html);
    if(words<420)fail(`${game.key}: guide content is too thin (${words} words)`);
    if(!html.includes(`href="/${game.slug}/"`))fail(`${game.key}: guide does not link back to the game`);
  }
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
  if(/snapdesk-74kq/.test(sitemap))fail('sitemap.xml exposes the private content desk');
}
const robotsFile=path.join(dist,'robots.txt');
if(!await exists(robotsFile))fail('robots.txt is missing');
else{
  const robots=await fs.readFile(robotsFile,'utf8');
  if(!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`))fail('robots.txt does not declare sitemap.xml');
  if(!robots.includes('Disallow: /api/'))fail('robots.txt does not exclude API routes');
}

const headers=await fs.readFile(path.join(dist,'_headers'),'utf8').catch(()=> '');
for(const game of GAMES){
  const route=`/${game.slug}/*`;
  const pos=headers.indexOf(route);
  if(pos>=0&&/X-Robots-Tag:\s*noindex/i.test(headers.slice(pos,pos+160)))fail(`${game.key}: launch route still receives X-Robots-Tag noindex`);
}

if(warnings.length){console.warn(`Platform audit warnings (${warnings.length}):`);for(const item of warnings)console.warn(`  - ${item}`);}
if(failures.length){console.error(`Platform audit failed (${failures.length}):`);for(const item of failures)console.error(`  - ${item}`);process.exit(1);}
console.log(`Platform audit passed: ${GAMES.length} games, ${publicHtml.length} public HTML pages, ${canonicals.size} indexable canonicals, no dead internal links.`);
