import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const profileLink='<a class="account-menu-link" href="/profile/">Profile</a>';
const profilePanel=/<section class="panel profile"><div class="panel-heading"><strong>Your profile<\/strong><span>[^<]*<\/span><\/div><div id="profileBody"><div class="profile-loading">Loading profile…<\/div><\/div><\/section>/g;

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function addAccountProfileLink(html){
  if(html.includes('class="account-menu-link"'))return html;
  return html.replace('<div id="accountMenu" class="account-menu" hidden><button id="logoutButton" type="button">Sign out</button></div>',`<div id="accountMenu" class="account-menu" hidden>${profileLink}<button id="logoutButton" type="button">Sign out</button></div>`);
}

function addAccountStyles(html){
  if(html.includes('/assets/styles/account-profile.css'))return html;
  return html.replace('</head>','<link rel="stylesheet" href="/assets/styles/account-profile.css"></head>');
}

function removeGameProfileRail(html){
  if(!html.includes('class="game-page"'))return html;
  // Keep a zero-layout state host because the existing game runtime hydrates Daily
  // completion and streak data through the profile endpoint.
  const next=html.replace(profilePanel,'<div id="profileBody" hidden></div>');
  if(next.includes('class="panel profile"'))throw new Error('Visible game Profile rail survived account-profile generation.');
  if(!next.includes('<div id="profileBody" hidden></div>'))throw new Error('Daily profile state host is missing after rail removal.');
  return next;
}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  let html=await fs.readFile(file,'utf8');
  html=addAccountProfileLink(addAccountStyles(removeGameProfileRail(html)));
  await fs.writeFile(file,html);
}

const aboutFile=path.join(dist,'about','index.html');
let profile=await fs.readFile(aboutFile,'utf8');
profile=profile
  .replaceAll('https://snapoki.com/about/','https://snapoki.com/profile/')
  .replace(/<title>[\s\S]*?<\/title>/,'<title>Your Profile | Snapoki</title>')
  .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="View your Snapoki runs, personal-best scores, progression and Daily streaks across every puzzle game.">')
  .replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="https://snapoki.com/profile/">')
  .replace(/<meta property="og:title" content="[^"]*">/,'<meta property="og:title" content="Your Profile | Snapoki">')
  .replace(/<meta property="og:description" content="[^"]*">/,'<meta property="og:description" content="Your Snapoki puzzle progression in one place.">')
  .replace(/<meta property="og:url" content="[^"]*">/,'<meta property="og:url" content="https://snapoki.com/profile/">')
  .replace(/<meta name="twitter:title" content="[^"]*">/,'<meta name="twitter:title" content="Your Profile | Snapoki">')
  .replace(/<meta name="twitter:description" content="[^"]*">/,'<meta name="twitter:description" content="Your Snapoki puzzle progression in one place.">')
  .replace(/<meta name="robots" content="[^"]*">/i,'<meta name="robots" content="noindex,follow">')
  .replace('class="legal-page-body"','class="profile-page-body"')
  .replace(/<main>[\s\S]*?<\/main>/,`<main><section class="account-profile-shell"><div class="account-profile-heading"><span class="eyebrow">Your account</span><h1>Your Profile</h1><p>Runs, Personal Bests, progression and Daily streaks across all ${GAMES.length} Snapoki games.</p></div><div id="accountProfile" class="account-profile-state" aria-live="polite"><div class="account-profile-loading">Loading your profile…</div></div></section><script type="module" src="/assets/js/profile-page.js"></script></main>`);

const profileDir=path.join(dist,'profile');
await fs.mkdir(profileDir,{recursive:true});
await fs.writeFile(path.join(profileDir,'index.html'),profile);
console.log(`Account profile complete: game rails balanced and /profile/ generated for ${GAMES.length} games.`);
