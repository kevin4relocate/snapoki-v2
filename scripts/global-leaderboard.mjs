import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const siteUrl='https://snapoki.com';
const leaderboardLink='<a class="desktop-game-link leaderboard-nav-link" href="/leaderboard/">Leaderboard</a>';

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function addHeaderLink(html){
  if(html.includes('class="leaderboard-nav-link"'))return html;
  html=html.replace('<div class="games-menu-wrap">',`${leaderboardLink}<div class="games-menu-wrap">`);
  html=html.replace('<nav id="mobileMenu" class="mobile-menu" aria-label="Mobile navigation" hidden>','<nav id="mobileMenu" class="mobile-menu" aria-label="Mobile navigation" hidden><a href="/leaderboard/">Leaderboard</a>');
  return html;
}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  const html=await fs.readFile(file,'utf8');
  await fs.writeFile(file,addHeaderLink(html));
}

const aboutFile=path.join(dist,'about','index.html');
let page=await fs.readFile(aboutFile,'utf8');
page=addHeaderLink(page)
  .replaceAll('https://snapoki.com/about/','https://snapoki.com/leaderboard/')
  .replace(/<title>[\s\S]*?<\/title>/,'<title>Leaderboard | Snapoki</title>')
  .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Climb the Snapoki global leaderboard. Compete on Career XP, Skill Mastery and total Runs across every puzzle game.">')
  .replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="https://snapoki.com/leaderboard/">')
  .replace(/<meta property="og:title" content="[^"]*">/,'<meta property="og:title" content="Leaderboard | Snapoki">')
  .replace(/<meta property="og:description" content="[^"]*">/,'<meta property="og:description" content="Play more. Improve your PB. Climb the Snapoki leaderboard.">')
  .replace(/<meta property="og:url" content="[^"]*">/,'<meta property="og:url" content="https://snapoki.com/leaderboard/">')
  .replace(/<meta name="twitter:title" content="[^"]*">/,'<meta name="twitter:title" content="Leaderboard | Snapoki">')
  .replace(/<meta name="twitter:description" content="[^"]*">/,'<meta name="twitter:description" content="Play more. Improve your PB. Climb the Snapoki leaderboard.">')
  .replace('</head>','<link rel="stylesheet" href="/assets/styles/global-leaderboard.css"></head>')
  .replace(/<main>[\s\S]*?<\/main>/,`<main><section class="leaderboard-page-shell" data-global-leaderboard><div class="leaderboard-hero"><div><span class="eyebrow">All games · Global competition</span><h1>🏆 Snapoki <span>Leaderboard</span></h1><p>Play more. Improve your PB. Climb the board. Compete across every Snapoki puzzle with three different ways to rank.</p></div><div class="leaderboard-hero-stat"><b>${GAMES.length} games</b><small>One global board</small></div></div><div id="globalLeaderboardTabs" class="leaderboard-tabs" role="tablist" aria-label="Leaderboard type"></div><p id="globalLeaderboardStatus" class="leaderboard-status" aria-live="polite"></p><section class="leaderboard-card" aria-label="Global leaderboard"><div class="leaderboard-card-head"><span>Rank</span><span>Player</span><span>Score</span></div><div id="globalLeaderboardList"><div class="leaderboard-loading">Loading the board…</div></div></section><section id="globalLeaderboardYourRank" class="leaderboard-your-rank" hidden><div class="leaderboard-your-copy"><strong id="globalLeaderboardYourRankLabel">Your rank</strong><small id="globalLeaderboardRankHint">Keep playing to climb.</small></div><div class="leaderboard-your-number"><b id="globalLeaderboardRankNumber">#—</b><span id="globalLeaderboardRankMetric">—</span></div></section><p class="leaderboard-note">Career rewards progression through XP. Skill is your combined best verified performance across all games. Runs counts every verified completion. <button id="leaderboardSignIn" class="button button-ghost" type="button">Sign in to see your rank</button></p></section><script type="module" src="/assets/js/global-leaderboard.js"></script></main>`);

const dir=path.join(dist,'leaderboard');
await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,'index.html'),page);

const sitemapFile=path.join(dist,'sitemap.xml');
let sitemap=await fs.readFile(sitemapFile,'utf8');
if(!sitemap.includes('<loc>https://snapoki.com/leaderboard/</loc>'))sitemap=sitemap.replace('</urlset>','  <url><loc>https://snapoki.com/leaderboard/</loc></url>\n</urlset>');
await fs.writeFile(sitemapFile,sitemap);

console.log(`Global leaderboard generated with Career, Skill and Runs boards for ${GAMES.length} games.`);
