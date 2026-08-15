import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES, FEATURED_GAMES} from '../src/js/games-config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const siteUrl = 'https://snapoki.com';

await fs.rm(dist, {recursive: true, force: true});
await fs.mkdir(dist, {recursive: true});

async function copyDir(from, to) {
  await fs.mkdir(to, {recursive: true});
  for (const entry of await fs.readdir(from, {withFileTypes: true})) {
    const src = path.join(from, entry.name), dest = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dest);
    else await fs.copyFile(src, dest);
  }
}
await copyDir(path.join(root, 'public'), dist);
await copyDir(path.join(root, 'src', 'js'), path.join(dist, 'assets', 'js'));
await copyDir(path.join(root, 'src', 'styles'), path.join(dist, 'assets', 'styles'));

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function header() {
  const featured = FEATURED_GAMES.map(game => `<a class="desktop-game-link" data-game-link="${game.key}" href="/${game.slug}/">${esc(game.name)}</a>`).join('');
  const allGames = GAMES.map(game => `<a data-game-link="${game.key}" href="/${game.slug}/"><span>${esc(game.name)}</span><small>${esc(game.category)}</small></a>`).join('');
  const mobileGames = GAMES.map(game => `<a data-game-link="${game.key}" href="/${game.slug}/">${esc(game.name)}</a>`).join('');
  return `<header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="/" aria-label="Snapoki home"><img src="/brand/logo-mark.svg" width="38" height="38" alt=""><span>Snapoki</span></a>
      <nav class="desktop-nav" aria-label="Main navigation">${featured}<div class="games-menu-wrap"><button id="gamesMenuToggle" class="nav-menu-button" type="button" aria-haspopup="true" aria-expanded="false">Games <span aria-hidden="true">▾</span></button><div id="gamesMenu" class="games-dropdown" hidden>${allGames}</div></div></nav>
      <div class="header-actions">
        <button id="mobileMenuToggle" class="mobile-menu-toggle" type="button" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
        <div id="accountSlot" class="account-slot">
          <div id="accountSkeleton" class="account-skeleton" aria-hidden="true"></div>
          <button id="loginButton" class="login-button" type="button" hidden>Login</button>
          <button id="userButton" class="user-button" type="button" aria-haspopup="true" hidden><img id="userAvatar" width="28" height="28" alt=""><span id="userName">Player</span><span aria-hidden="true">▾</span></button>
          <div id="accountMenu" class="account-menu" hidden><button id="logoutButton" type="button">Sign out</button></div>
        </div>
      </div>
    </div>
    <nav id="mobileMenu" class="mobile-menu" aria-label="Mobile navigation" hidden>${mobileGames}<a href="/about/">About</a><a href="/help/">Help</a></nav>
  </header>`;
}

function footer() {
  const gameLinks = GAMES.map(game => `<a href="/${game.slug}/">${esc(game.name)}</a>`).join('');
  return `<footer class="site-footer"><div class="footer-inner"><div class="footer-brand"><a class="brand" href="/"><img src="/brand/logo-mark.svg" width="34" height="34" alt=""><span>Snapoki</span></a><p>Free browser puzzles for quick breaks, daily challenges and friendly competition.</p></div><div class="footer-column"><strong>Games</strong>${gameLinks}</div><div class="footer-column"><strong>Snapoki</strong><a href="/about/">About</a><a href="/help/">Help</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/sitemap.xml">Sitemap</a></div></div><div class="footer-bottom">© <span id="footerYear">2026</span> Snapoki. Play smart, have fun.</div></footer>`;
}

function loginModal() {
  return `<div id="loginModal" class="modal-backdrop login-modal" role="dialog" aria-modal="true" aria-labelledby="loginTitle" hidden><div class="modal-card login-card"><button id="loginClose" class="modal-close" type="button" aria-label="Close sign in">×</button><img src="/brand/logo-mark.svg" width="56" height="56" alt=""><h2 id="loginTitle">Sign in to Snapoki</h2><p id="loginMessage">Save your scores, build streaks, and join game rankings.</p><div id="googleSignInHost" class="google-signin-host"></div><small>By continuing, you agree to the Snapoki Terms and Privacy Policy.</small></div></div>`;
}

function documentShell({title, description, canonical, bodyClass = '', bodyAttrs = '', content, jsonLd = null}) {
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><meta name="theme-color" content="#080B14"><meta property="og:type" content="website"><meta property="og:site_name" content="Snapoki"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${siteUrl}/brand/social-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${siteUrl}/brand/social-card.png"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/assets/styles/site.css"><link rel="stylesheet" href="/assets/styles/games.css">${ld}</head><body class="${bodyClass}" ${bodyAttrs}>${header()}<main>${content}</main>${footer()}${loginModal()}<script type="module" src="/assets/js/site.js"></script></body></html>`;
}

function gameCard(game) {
  return `<a class="game-card" href="/${game.slug}/"><div class="game-card-icon game-card-icon--${game.key}">${game.name.slice(0,1)}</div><div><span class="eyebrow">${esc(game.category)} puzzle</span><h3>${esc(game.name)}</h3><p>${esc(game.tagline)}</p></div><span class="card-arrow" aria-hidden="true">→</span></a>`;
}

const homeContent = `<section class="home-hero"><div class="home-hero-copy"><span class="eyebrow">Free browser puzzles</span><h1>Five puzzles.<br><span>Endless challenges.</span></h1><p>Play quick logic and path puzzles, tackle the same daily boards as everyone else, and climb each game’s cumulative rankings.</p><div class="hero-actions"><a class="button button-primary" href="/maze/">Play a Game</a><a class="button button-secondary" href="#games">Explore all games</a></div><div class="hero-proof"><span>✓ No download</span><span>✓ Free to play</span><span>✓ Mobile friendly</span></div></div><div class="home-hero-visual" aria-hidden="true"><div class="visual-grid">${Array.from({length:25},(_,i)=>`<span class="v${i%7===0||i===18?' hot':''}"></span>`).join('')}</div><div class="visual-chip">Daily Challenge <b>3/3</b></div></div></section>
<section id="games" class="section"><div class="section-heading"><div><span class="eyebrow">Choose your puzzle</span><h2>Five ways to think differently</h2></div><p>Every game includes Easy, Medium and Hard boards, unlimited play, hints, solutions and a shared daily challenge.</p></div><div class="game-card-grid">${GAMES.map(gameCard).join('')}</div></section>
<section class="section daily-home"><div class="daily-home-copy"><span class="eyebrow">New every day</span><h2>Today’s challenges are waiting.</h2><p>Each Snapoki game gets the same three deterministic Daily boards for every player. Finish Easy, Medium and Hard to complete the day.</p><a class="button button-primary" href="/number-path/?mode=daily&difficulty=easy">Start a Daily Challenge</a></div><div class="daily-home-levels"><div><span>01</span><b>Easy</b><small>Warm up</small></div><div><span>02</span><b>Medium</b><small>Think ahead</small></div><div><span>03</span><b>Hard</b><small>Push your logic</small></div></div></section>
<section class="section feature-strip"><article><b>🏆</b><h3>Cumulative Rankings</h3><p>Every ranked finish earns points. Keep playing and keep improving.</p></article><article><b>🔥</b><h3>Daily Streaks</h3><p>Come back each day and build a streak for each puzzle you enjoy.</p></article><article><b>💡</b><h3>Hints without dead ends</h3><p>Use a hint when you need a nudge. View the full solution for practice.</p></article></section>
<section class="section faq"><div class="section-heading"><div><span class="eyebrow">FAQ</span><h2>About Snapoki</h2></div></div><details><summary>Is Snapoki free?</summary><p>Yes. Snapoki’s puzzle games are designed to be playable for free in a modern browser.</p></details><details><summary>Do I need an account?</summary><p>No account is required to play. Sign in with Google only if you want to save ranked results, Ranking Points and streaks.</p></details><details><summary>How do Daily Challenges work?</summary><p>Every player receives the same Easy, Medium and Hard Daily board for each game based on the UTC date.</p></details><details><summary>What happens if I view a solution?</summary><p>The current run becomes practice-only. You can still finish it, but it will not be saved to Rankings.</p></details></section>`;

await fs.writeFile(path.join(dist, 'index.html'), documentShell({
  title: 'Snapoki – Free Daily Puzzle Games Online',
  description: 'Play five free browser puzzle games: Maze, Number Path, Color Connect, Lights Out and Loop Puzzle. Daily challenges, rankings and no download required.',
  canonical: `${siteUrl}/`,
  bodyClass: 'home-page',
  content: homeContent,
  jsonLd: {'@context':'https://schema.org','@type':'WebSite',name:'Snapoki',url:`${siteUrl}/`,description:'Free browser puzzle games with daily challenges and rankings.'}
}));

function gamePage(game) {
  const difficultyButtons = game.levels.map(([key,label,detail], index) => `<button class="difficulty-button${index===0?' active':''}" data-difficulty="${key}" type="button"><span>${label}</span><small>${detail}</small></button>`).join('');
  const metrics = game.metrics.map(([key,label]) => `<div class="metric"><b data-metric-value="${key}">${key==='time'?'00:00':'0'}</b><small>${label}</small></div>`).join('');
  const rules = game.howTo.map((text,i) => `<p><strong>${i+1}.</strong> ${esc(text)}</p>`).join('');
  const dailyButtons = game.levels.map(([key,label,detail]) => `<button class="daily-level" data-difficulty="${key}" type="button"><span>${label}</span><small>${detail}</small><i aria-hidden="true">✓</i></button>`).join('');
  const content = `<section class="game-hero"><span class="eyebrow">${esc(game.category)} puzzle</span><h1>${esc(game.tagline)}</h1><p>${esc(game.description)}</p><div class="hero-pills">${game.heroPills.map(pill=>`<span>${esc(pill)}</span>`).join('')}</div></section>
  <div class="mode-switch" aria-label="Game mode"><button class="mode-button active" data-mode="normal" type="button">Unlimited</button><button class="mode-button" data-mode="daily" type="button">⭐ Daily Challenge</button></div>
  <section class="game-layout">
    <aside class="panel left-panel"><div class="panel-heading"><strong>Difficulty</strong><span>Choose a board</span></div><div class="difficulty-list">${difficultyButtons}</div><div class="metrics-grid">${metrics}</div><div class="control-stack"><button id="newPuzzle" class="button button-primary control-primary" type="button">New Puzzle</button><div class="control-row"><button id="hint" class="button button-secondary" type="button">Hint</button><button id="solution" class="button button-secondary" type="button">Solution</button></div><button id="undoAction" class="button button-secondary" type="button" hidden>Undo</button><button id="resetPuzzle" class="button button-ghost" type="button">Reset Puzzle</button></div><p id="gameStatus" class="game-status" aria-live="polite">Preparing puzzle…</p></aside>
    <section class="panel board-panel"><div class="board-toolbar"><div><span class="live-dot"></span><strong id="boardModeLabel">Unlimited · ${esc(game.name)}</strong></div><span>${esc(game.name)}</span></div><div id="gameBoard" class="game-board" aria-live="off"></div></section>
    <aside class="right-panel"><section class="panel how-to"><div class="panel-heading"><strong>How to play</strong><span>${esc(game.name)}</span></div>${rules}</section><section class="panel rankings"><div class="panel-heading"><strong>🏆 Rankings</strong><span>Cumulative</span></div><p class="panel-note">Every ranked finish adds Ranking Points.</p><div id="rankingList" class="ranking-state">Loading rankings…</div></section><section class="panel profile"><div class="panel-heading"><strong>Your profile</strong><span>${esc(game.name)}</span></div><div id="profileBody"><div class="profile-loading">Loading profile…</div></div></section></aside>
  </section>
  <section class="section daily-section"><div class="daily-heading"><div><span class="eyebrow">Same boards for everyone</span><h2>⭐ Today’s ${esc(game.name)}</h2><p>Complete Easy, Medium and Hard before the UTC day resets.</p></div><div class="daily-countdown"><small>NEW BOARDS IN</small><b id="dailyCountdown">--:--:--</b></div></div><div class="daily-progress"><strong id="dailyProgress">0 of 3 completed</strong><div>${dailyButtons}</div></div></section>
  <section class="section game-seo"><h2>Play ${esc(game.name)} online for free</h2><p>${esc(game.description)} Snapoki creates fresh unlimited boards whenever you want another puzzle, plus three shared Daily Challenge boards each day. You can play without an account, or sign in to save ranked finishes and build cumulative Ranking Points.</p><p>Choose Easy when you want a quick puzzle, Medium for a more deliberate challenge, or Hard when you want the most demanding version of ${esc(game.name)}.</p></section>
  <div id="resultModal" class="modal-backdrop result-modal" role="dialog" aria-modal="true" aria-labelledby="resultGameName" hidden><div class="modal-card result-card"><button id="resultClose" class="modal-close" type="button" aria-label="Start a new puzzle">×</button><span class="result-badge">COMPLETE</span><h2 id="resultGameName">${esc(game.name)} Complete!</h2><div id="resultScore" class="result-score">0</div><div id="resultDifficulty" class="result-difficulty"></div><div class="result-breakdown"><div><b id="resultTime">00:00</b><small>TIME</small></div><div><b id="resultHints">0</b><small>HINTS</small></div><div><b id="resultMode">Unlimited</b><small>MODE</small></div><div><b id="resultRankPoints">—</b><small>RANK PTS</small></div></div><p id="resultSaveStatus" class="result-save-status" aria-live="polite"></p><div class="result-actions"><button id="resultAgain" class="button button-secondary" type="button">Play Again</button><button id="resultNew" class="button button-primary" type="button">New Puzzle</button><button id="resultNext" class="button button-ghost" type="button">Next →</button></div></div></div>`;
  return documentShell({
    title: game.seoTitle,
    description: game.seoDescription,
    canonical: `${siteUrl}/${game.slug}/`,
    bodyClass: 'game-page',
    bodyAttrs: `data-game="${game.key}"`,
    content: `${content}<script type="module" src="/assets/js/game-page.js"></script>`,
    jsonLd: {'@context':'https://schema.org','@type':'VideoGame',name:game.name,url:`${siteUrl}/${game.slug}/`,description:game.seoDescription,applicationCategory:'Game',operatingSystem:'Any modern web browser',isAccessibleForFree:true}
  });
}

for (const game of GAMES) {
  const dir = path.join(dist, game.slug);
  await fs.mkdir(dir, {recursive:true});
  await fs.writeFile(path.join(dir, 'index.html'), gamePage(game));
}

const infoPages = {
  about: {title:'About Snapoki', description:'Learn what Snapoki is and how its free browser puzzle games are designed.', body:`<span class="eyebrow">About</span><h1>Small puzzles. Clear thinking.</h1><p>Snapoki is a collection of browser-based logic and path puzzles designed for quick play, daily routines and friendly competition.</p><h2>What we build</h2><p>Every game uses the same core experience: three difficulty levels, unlimited puzzles, a shared Daily Challenge, optional hints and a practice solution.</p><h2>Accounts are optional</h2><p>You can play without signing in. A Google account is only used when you choose to save ranked results, Ranking Points and streaks.</p>`},
  help: {title:'Snapoki Help', description:'Get help with Snapoki games, Daily Challenges, rankings and sign-in.', body:`<span class="eyebrow">Help</span><h1>How can we help?</h1><h2>Playing a game</h2><p>Choose a game from the header, select a difficulty, then use New Puzzle whenever you want a fresh board. Reset Puzzle restarts the current board.</p><h2>Hints and solutions</h2><p>Hints are allowed in ranked runs but reduce Ranking Points. Viewing a full Solution makes that attempt practice-only.</p><h2>Daily Challenge</h2><p>Daily boards reset at 00:00 UTC. Everyone receives the same Easy, Medium and Hard board for each game.</p><h2>Rankings</h2><p>Each game has its own cumulative ranking. Every eligible finish adds Ranking Points to your total.</p>`},
  privacy: {title:'Privacy Policy – Snapoki', description:'Read the Snapoki privacy policy.', body:`<span class="eyebrow">Legal</span><h1>Privacy Policy</h1><p>Snapoki is designed to require as little personal information as practical.</p><h2>Account information</h2><p>If you choose Google sign-in, Snapoki stores the account identifier, email address, display name and avatar supplied by Google so your saved results can belong to your account.</p><h2>Game results</h2><p>Ranked results may store game, difficulty, score, Ranking Points, completion time, hint count and limited puzzle metadata.</p><h2>Cookies</h2><p>A secure, HttpOnly session cookie is used to keep signed-in users authenticated. It is not used for advertising tracking.</p><h2>Contact</h2><p>Additional contact information can be added here before public launch.</p>`},
  terms: {title:'Terms of Use – Snapoki', description:'Read the Snapoki terms of use.', body:`<span class="eyebrow">Legal</span><h1>Terms of Use</h1><p>Snapoki provides browser puzzle games for personal entertainment.</p><h2>Fair play</h2><p>Do not manipulate requests, automate gameplay or intentionally submit fabricated ranked results.</p><h2>Availability</h2><p>Games, rankings and account features may change or be temporarily unavailable while the service is maintained.</p><h2>Accounts</h2><p>You are responsible for access to the Google account you use to sign in.</p>`}
};
for (const [slug,page] of Object.entries(infoPages)) {
  const dir = path.join(dist, slug); await fs.mkdir(dir,{recursive:true});
  const content = `<section class="legal-page">${page.body}</section>`;
  await fs.writeFile(path.join(dir,'index.html'), documentShell({title:page.title,description:page.description,canonical:`${siteUrl}/${slug}/`,content}));
}

const sitemapPaths = ['/', ...GAMES.map(game=>`/${game.slug}/`), '/about/','/help/','/privacy/','/terms/'];
await fs.writeFile(path.join(dist,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map(p=>`<url><loc>${siteUrl}${p}</loc><changefreq>${p==='/'?'weekly':p.includes('privacy')||p.includes('terms')?'yearly':'daily'}</changefreq></url>`).join('')}</urlset>`);
await fs.writeFile(path.join(dist,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
await fs.writeFile(path.join(dist,'manifest.webmanifest'), JSON.stringify({name:'Snapoki',short_name:'Snapoki',start_url:'/',display:'standalone',background_color:'#080B14',theme_color:'#080B14',icons:[{src:'/brand/logo-mark-192.png',sizes:'192x192',type:'image/png'},{src:'/brand/logo-mark-512.png',sizes:'512x512',type:'image/png'}]},null,2));
await fs.writeFile(path.join(dist,'404.html'), documentShell({title:'Page not found – Snapoki',description:'The Snapoki page you requested could not be found.',canonical:`${siteUrl}/404`,content:`<section class="not-found"><span class="eyebrow">404</span><h1>That path is a dead end.</h1><p>Try another puzzle instead.</p><a class="button button-primary" href="/">Back to Snapoki</a></section>`}));
console.log(`Built Snapoki V2: ${GAMES.length} games + homepage + SEO pages.`);
