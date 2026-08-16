import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
async function patch(rel,mutate){
  const file=path.join(dist,rel);
  let text=await fs.readFile(file,'utf8');
  text=mutate(text);
  await fs.writeFile(file,text);
}

const echoDesktop='<a class="desktop-game-link" data-game-link="echo-step" href="/echo-step/">Echo Step</a>';
const echoMobile='<a data-game-link="echo-step" href="/echo-step/">Echo Step</a>';
const echoFooter='<a href="/echo-step/">Echo Step</a>';
const echoCard='<a class="game-card" href="/echo-step/"><div class="game-card-icon game-card-icon--echo-step">E</div><div><span class="eyebrow">Logic puzzle</span><h3>Echo Step</h3><p>Move YOU now while Echo repeats your moves later. Reach P and E on the same turn.</p></div><span class="card-arrow" aria-hidden="true">→</span></a>';
const echoGuideCard='<a class="guide-card" href="/blog/how-to-play-echo-step/"><img src="/brand/guides/echo-step.svg" width="900" height="500" loading="lazy" alt="Echo Step puzzle preview"><div><span class="eyebrow">Logic guide</span><h2>How to Play Echo Step</h2><p>Move YOU now, plan for Echo repeating the same moves later, and reach P and E on the same turn.</p><span class="text-link">Read guide →</span></div></a>';
const echoSpotlight='<section class="section daily-home" data-echo-step-spotlight><div class="daily-home-copy"><span class="eyebrow">New puzzle</span><h2>Your moves come back.</h2><p>Move purple YOU now while cyan Echo repeats the same moves a few turns later. Purple, cyan and dark striped cells affect who can enter, so every move has to work now and later.</p><a class="button button-primary" href="/echo-step/">Play Echo Step</a></div><div class="daily-home-levels"><div><span>01</span><b>YOU → P</b><small>Your goal</small></div><div><span>02</span><b>ECHO → E</b><small>Echo’s goal</small></div><div><span>03</span><b>SAME TURN</b><small>Finish together</small></div></div></section>';
const social='<div class="footer-social" aria-label="Snapoki social links"><a href="https://www.linkedin.com/company/snapoki/" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on LinkedIn"><span class="social-glyph" aria-hidden="true">in</span><span>LinkedIn</span></a><a href="https://www.instagram.com/playsnapoki/" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on Instagram"><span class="social-glyph" aria-hidden="true">IG</span><span>Instagram</span></a><a href="https://x.com/playsnapoki" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on X"><span class="social-glyph social-glyph--x" aria-hidden="true">X</span><span>@playsnapoki</span></a><a href="https://www.facebook.com/playsnapoki" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on Facebook"><span class="social-glyph" aria-hidden="true">f</span><span>Facebook</span></a></div>';

function revealEcho(html){
  if(html.includes('<nav class="desktop-nav"')&&!html.includes('class="desktop-game-link" data-game-link="echo-step"'))html=html.replace(/(<nav class="desktop-nav"[^>]*>)/,`$1${echoDesktop}`);
  if(html.includes('<nav id="mobileMenu"')&&!new RegExp('<nav id="mobileMenu"[\\s\\S]*?data-game-link="echo-step"').test(html))html=html.replace(/(<nav id="mobileMenu"[^>]*>)/,`$1${echoMobile}`);
  const gamesColumn='<div class="footer-column"><strong>Games</strong>',gamesStart=html.indexOf(gamesColumn);
  if(gamesStart>=0){const gamesEnd=html.indexOf('</div>',gamesStart),block=html.slice(gamesStart,gamesEnd);if(!block.includes('href="/echo-step/"'))html=html.slice(0,gamesStart)+block.replace('<strong>Games</strong>',`<strong>Games</strong>${echoFooter}`)+html.slice(gamesEnd);}
  return html;
}

function updateFooter(html){
  html=html.replace(/<a href="\/sitemap\.xml">Sitemap<\/a>/g,'');
  if(/<div class="footer-social"/.test(html))html=html.replace(/<div class="footer-social"[\s\S]*?<\/div>/,social);
  else html=html.replace(/(<div class="footer-brand">[\s\S]*?<p>[\s\S]*?<\/p>)/,`$1${social}`);
  html=html.replaceAll('https://x.com/snapoki_x','https://x.com/playsnapoki').replaceAll('@snapoki_x','@playsnapoki');
  html=html.replace(/"sameAs":\[[^\]]*\]/,`"sameAs":["https://www.linkedin.com/company/snapoki/","https://www.instagram.com/playsnapoki/","https://x.com/playsnapoki","https://www.facebook.com/playsnapoki"]`);
  return html;
}

function updateSharedCopy(html){
  return html
    .replaceAll('&amp;amp;','&amp;')
    .replaceAll('Five puzzles.<br><span>Endless challenges.</span>','Six puzzles.<br><span>Endless challenges.</span>')
    .replaceAll('Five ways to think differently','Six ways to think differently')
    .replaceAll('all five puzzle games','all six puzzle games')
    .replaceAll('All five puzzle games','All six puzzle games')
    .replaceAll('Five distinct puzzle systems','Six distinct puzzle systems')
    .replaceAll('Maze, Number Path, Color Connect, Lights Out and Loop Puzzle','Echo Step, Maze, Number Path, Color Connect, Lights Out and Loop Puzzle')
    .replaceAll('Move now. Sync with your past.','Move now. Echo follows later.');
}

const echoHowTo='<div class="echo-howto"><div class="echo-howto-goal"><strong>Goal</strong><div><b class="echo-howto-you">YOU → P</b><span>+</span><b class="echo-howto-echo">Echo → E</b><em>Same turn</em></div></div><div class="echo-howto-row"><strong>Move</strong><p>Move <b class="echo-howto-you">YOU</b>. Echo repeats each move after the delay shown above the board.</p></div><div class="echo-howto-row"><strong>Walls</strong><p><b class="echo-howto-purple">Purple</b> blocks YOU · <b class="echo-howto-cyan">Cyan</b> blocks Echo · <b>Dark</b> blocks both.</p></div><div class="echo-howto-row"><strong>Avoid</strong><p>If Echo hits a blocked cell, leaves the board, or hits YOU, use <b>Retry</b>.</p></div><div class="echo-howto-tools"><span><b>Hint</b> · next 3 moves</span><span><b>Guide</b> · step-by-step practice</span></div></div>';

function updateEchoPage(html){
  html=html.replace(/(<section class="panel how-to"><div class="panel-heading"><strong>How to play<\/strong><span>Echo Step<\/span><\/div>)[\s\S]*?(<\/section><section class="panel rankings">)/,`$1${echoHowTo}$2`);
  if(!html.includes('/assets/styles/echo-step-launch.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/echo-step-launch.css"></head>');
  return html.replaceAll('Move now. Sync with your past.','Move now. Echo follows later.').replaceAll('Asymmetric phase walls','Striped cell rules');
}

function updateEchoGuide(html){
  return html
    .replaceAll('Purple phase walls block YOU only, cyan phase walls block Echo only, and dark walls block both — so the same command can be safe now but dangerous a few turns later.','Purple striped cells block YOU, cyan striped cells block Echo, and dark striped cells block both — so every move has to work for YOU now and Echo later.')
    .replaceAll('Purple phase walls marked Y block YOU only. Cyan phase walls marked E block Echo only. Dark walls block both, so you must plan the same command against two different obstacle maps.','Purple striped cells block YOU only. Cyan striped cells block Echo only. Dark striped cells block both.')
    .replaceAll('Hint and Solution reveal a valid synchronized route.','Hint shows the next three moves; Guide teaches the puzzle step by step.')
    .replaceAll('Use Echo Memory as a forecast','Check what Echo will replay')
    .replaceAll("Echo Memory shows the commands waiting to be replayed.","The replay row shows the moves Echo is waiting to repeat.")
    .replaceAll('safe on both timelines','safe for YOU now and Echo later')
    .replaceAll('off the board, or into YOU you must Retry.','off the board, or into YOU means you must Retry.')
    .replaceAll('two moments at once','YOU now and Echo later')
    .replaceAll('timeline fails','run ends')
    .replaceAll('phase wall','striped cell')
    .replaceAll('phase walls','striped cells');
}

function updateHome(html){
  html=updateSharedCopy(html);
  const grid='<div class="game-card-grid">',start=html.indexOf(grid);
  if(start>=0){const end=html.indexOf('</div></section>',start),block=html.slice(start,end);if(!block.includes('class="game-card" href="/echo-step/"'))html=html.slice(0,start)+block.replace(grid,`${grid}${echoCard}`)+html.slice(end);}
  if(!html.includes('data-echo-step-spotlight'))html=html.replace('<section class="section daily-home">',`${echoSpotlight}<section class="section daily-home">`);
  return html.replace('Play Maze, Number Path, Color Connect, Lights Out and Loop Puzzle online for free','Play Echo Step, Maze, Number Path, Color Connect, Lights Out and Loop Puzzle online for free');
}

function updateBlog(html){
  html=updateSharedCopy(html);
  const grid='<div class="guide-grid">',start=html.indexOf(grid);
  if(start>=0){const end=html.indexOf('</div><article>',start),block=html.slice(start,end);if(!block.includes('/blog/how-to-play-echo-step/'))html=html.slice(0,start)+block.replace(grid,`${grid}${echoGuideCard}`)+html.slice(end);}
  return html.replace('Snapoki does not treat board size as the only difficulty setting. Each game uses structural signals that match its rules: Maze emphasizes deceptive branches and detours, Number Path adds path constraints and blockers, Color Connect measures route dependencies with a solver, Lights Out uses minimum presses, and Loop Puzzle controls both loop shape and clue quality.','Snapoki does not treat board size as the only difficulty setting. Each game uses structural signals that match its rules: Echo Step adds delayed consequences, Maze emphasizes deceptive branches and detours, Number Path adds path constraints and blockers, Color Connect measures route dependencies with a solver, Lights Out uses minimum presses, and Loop Puzzle controls both loop shape and clue quality.');
}

function updateGeneralGuide(html){
  html=updateSharedCopy(html);
  if(!html.includes('<h2>Echo Step</h2>'))html=html.replace('<h2>Maze</h2>','<h2>Echo Step</h2><p>Move the purple YOU token toward P while cyan Echo repeats the same accepted moves after a delay. Reach YOU → P and Echo → E on the same turn. Purple striped cells block YOU, cyan striped cells block Echo, and dark cells block both.</p><h2>Maze</h2>');
  return html;
}

// Remove legacy staging noindex headers for the launch build.
await patch('_headers',headers=>headers
  .replace(/\n\/echo-step\/\*\n\s+X-Robots-Tag: noindex, nofollow, noarchive\n?/g,'\n')
  .replace(/\n\/blog\/how-to-play-echo-step\/\*\n\s+X-Robots-Tag: noindex, nofollow, noarchive\n?/g,'\n'));

const htmlFiles=(await walk(dist)).filter(file=>file.endsWith('.html'));
for(const file of htmlFiles){
  let html=await fs.readFile(file,'utf8');
  if(html.includes('data-private-utility="true"'))continue;
  html=revealEcho(html);
  html=updateFooter(html);
  html=updateSharedCopy(html);
  const rel=path.relative(dist,file).replaceAll('\\','/');
  if(rel==='index.html')html=updateHome(html);
  if(rel==='blog/index.html')html=updateBlog(html);
  if(rel==='blog/how-to-play-echo-step/index.html')html=updateEchoGuide(html);
  if(rel==='how-to-play/index.html')html=updateGeneralGuide(html);
  if(rel==='echo-step/index.html')html=updateEchoPage(html);
  await fs.writeFile(file,html);
}

console.log('Echo Step launch pass complete: public navigation, six-game surfaces, social handles and compact help.');
