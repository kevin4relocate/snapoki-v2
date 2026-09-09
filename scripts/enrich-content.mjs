import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';
import {getGamePresentation} from '../src/js/game-presentation.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const siteUrl='https://snapoki.com';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function setMeta(html,{title,description,slug}){
  const canonical=`${siteUrl}/${slug?`${slug}/`:''}`;
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/,`<link rel="canonical" href="${canonical}">`)
    .replace(/<meta property="og:title" content="[^"]*">/,`<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/,`<meta property="og:description" content="${esc(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/,`<meta property="og:url" content="${canonical}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/,`<meta name="twitter:title" content="${esc(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/,`<meta name="twitter:description" content="${esc(description)}">`);
  if(!html.includes('name="robots"'))html=html.replace('</head>','<meta name="robots" content="index,follow,max-image-preview:large"></head>');
  if(!html.includes('/assets/styles/content.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/content.css"></head>');
  if(!html.includes('/assets/styles/launch.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/launch.css"></head>');
  return html;
}
function contentPage({eyebrow,title,intro,body}){return `<section class="content-page"><div class="content-hero"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(intro)}</p></div><article>${body}</article></section>`;}
function gameCards(){return GAMES.map(game=>`<div class="content-card"><h3><a href="/${game.slug}/">${esc(game.name)}</a></h3><p>${esc(game.description)}</p></div>`).join('');}
function controlCards(){return GAMES.map(game=>{const ui=getGamePresentation(game),first=ui.rows[0]?.[1]||game.howTo?.[0]||game.description;return `<div class="content-card"><h3>${esc(game.name)}</h3><p>${esc(first)}</p></div>`;}).join('');}
function gameRuleSections(){return GAMES.map(game=>`<h2>${esc(game.name)}</h2><p>${esc(game.description)}</p><ul>${game.howTo.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ul><p><a href="/${game.slug}/">Play ${esc(game.name)}</a> · <a href="/blog/how-to-play-${game.slug}/">Read the full ${esc(game.name)} guide</a></p>`).join('');}

const pages={
  about:{
    title:'About Snapoki – Thoughtful Browser Puzzle Games',
    description:'Learn how Snapoki designs free browser puzzles around clear rules, real difficulty progression, shared Daily Challenges and instant guest play.',
    eyebrow:'About Snapoki',heading:'Puzzles built for thinking, not friction.',
    intro:'Snapoki is a collection of browser-first logic and path games designed to start quickly, explain themselves clearly and become meaningfully harder as your reasoning improves.',
    body:`<h2>Why Snapoki exists</h2><p>Many puzzle sites make a game harder mainly by making the board larger. Snapoki takes a different approach. Board size can change, but difficulty should also come from the structure of the problem: fewer clues, tighter bottlenecks, more route decisions, longer deductions, deeper dead ends or a higher minimum number of moves.</p><p>The goal is a site that works for a quick break but still has enough depth to reward repeat play. Every game supports Regular Play for fresh boards and a Daily Challenge for players who enjoy a shared routine.</p><h2>${GAMES.length} puzzle systems, one platform</h2><div class="content-grid">${gameCards()}</div><h2>Difficulty should change the thinking</h2><p>Each engine calibrates difficulty using signals that match its own rules. A harder board can add route pressure, reduce guidance, deepen false choices, increase delayed consequences or require more logical actions.</p><h2>No account needed</h2><p>Snapoki is designed as open entertainment. There is no public registration or sign-in flow. Open a game, choose a difficulty and play. Daily completion is stored only in the current browser so it can remember today’s progress without creating an account.</p><div class="callout"><strong>Snapoki’s product rule</strong><span>Keep the game understandable, keep the platform consistent, and make difficulty come from better puzzle structure rather than unnecessary friction.</span></div>`
  },
  help:{
    title:'Snapoki Help – Controls, Daily Challenges & Troubleshooting',
    description:'Get help with Snapoki controls, hints, solutions, Daily Challenges, mobile play and common browser issues. No account or sign-in is required.',
    eyebrow:'Help center',heading:'Get back to the puzzle quickly.',
    intro:'This guide covers the controls shared across Snapoki, what changes between Regular Play and Daily Challenge, and what to try if a board does not behave as expected.',
    body:`<h2>Starting a puzzle</h2><p>Choose Easy, Medium or Hard from the left panel, then choose Regular Play or Daily Challenge above the board. New Puzzle creates a fresh board at the current difficulty. Reset Puzzle returns the current board to its starting state.</p><h2>Hints and Solutions</h2><p><strong>Hint</strong> reveals a limited next action. Use it whenever you want a nudge.</p><p><strong>Solution</strong> or <strong>Guide</strong> opens a full practice aid. Once used, the current board stays in practice mode; start a New Puzzle for a fresh board.</p><h2>Game controls</h2><div class="content-grid">${controlCards()}</div><h2>Daily progress</h2><p>Complete Easy, Medium and Hard for the same game before the UTC day changes. Snapoki stores that Daily progress only in this browser using local storage. Clearing browser site data removes it.</p><h2>Troubleshooting</h2><ol><li>Reload the page if a deployment has just completed and your browser still has older assets.</li><li>Make sure JavaScript and local storage are available if Daily progress is not remembered.</li><li>On touch devices, start gestures inside the board rather than from the browser edge.</li><li>If a puzzle behaves unexpectedly, start a New Puzzle and try again.</li></ol><p>If a problem is reproducible, note the game, difficulty, device/browser and what action happened immediately before the issue.</p>`
  },
  privacy:{
    title:'Snapoki Privacy Policy',description:'Read how Snapoki handles browser-local Daily progress and ordinary hosting data without requiring public accounts or sign-in.',eyebrow:'Privacy',heading:'Privacy should be understandable.',intro:'Snapoki does not require public accounts, Google sign-in or profile registration to play.',
    body:`<h2>No public accounts</h2><p>Snapoki does not ask players to register an account or sign in to use the puzzle games.</p><h2>Daily progress on your device</h2><p>Daily completion and streak information may be stored in your browser’s local storage. This data stays associated with that browser profile and is not used to create a Snapoki account. Clearing site data can remove it.</p><h2>Hosting and network data</h2><p>Snapoki is hosted on Cloudflare infrastructure. Like ordinary websites, the hosting layer may process technical network and security information needed to deliver and protect the service.</p><h2>Analytics</h2><p>Snapoki uses Google Analytics to understand aggregate site usage such as page visits, device and browser characteristics, approximate geography and interaction patterns. Analytics is not required to play and is not used to create a Snapoki account.</p><h2>Changes</h2><p>Snapoki may update this policy when features or service providers change.</p>`
  },
  terms:{
    title:'Snapoki Terms of Use',description:'Read the basic rules for using Snapoki browser puzzle games for personal entertainment and practice.',eyebrow:'Terms of use',heading:'Play, think and have fun.',intro:'These terms describe the basic rules for using Snapoki’s browser puzzle games.',
    body:`<h2>Using Snapoki</h2><p>Snapoki provides browser-based puzzle games for personal entertainment and practice. No public account or sign-in is required.</p><h2>Hints and Solutions</h2><p>Hints and Solution tools are part of normal gameplay. A full Solution is intended as a practice aid for the current board.</p><h2>Availability</h2><p>Snapoki may change puzzle generation, scoring, difficulty calibration, Daily boards or site features as the product improves. The service may occasionally be unavailable because of maintenance, deployments or network failures.</p><h2>Site content</h2><p>The Snapoki name, interface, written explanations, generated brand assets and original site materials are provided as part of the service. Do not present an unauthorized copy as the official Snapoki service.</p><h2>Changes to these terms</h2><p>These terms may be updated when the service changes.</p>`
  },
  'how-to-play':{
    title:'How to Play Snapoki – Rules for All Puzzle Games',description:`Learn the rules and controls for all ${GAMES.length} Snapoki puzzle games, plus how hints, practice and Daily Challenges work.`,eyebrow:'Game guide',heading:'Learn the platform once. Start every game faster.',intro:'Each Snapoki game has its own puzzle logic, but the surrounding controls are intentionally consistent.',
    body:`<h2>Shared controls</h2><p>Every game offers Easy, Medium and Hard, New Puzzle, Hint and Reset Puzzle. Most games use Solution for full practice; games with a more interactive teaching flow may label that control Guide. Regular Play creates fresh boards. Daily Challenge uses the same board for everyone for that UTC date and difficulty.</p><table><thead><tr><th>Control</th><th>What it does</th><th>Use</th></tr></thead><tbody><tr><td>Hint</td><td>Shows a limited next action or short forecast.</td><td>Use when you want a nudge.</td></tr><tr><td>Solution / Guide</td><td>Shows a full practice aid on the board.</td><td>Turns the current board into practice.</td></tr><tr><td>Reset Puzzle</td><td>Returns the current board to its starting state.</td><td>Try the same board again.</td></tr><tr><td>New Puzzle</td><td>Starts a fresh board.</td><td>Get a new challenge.</td></tr></tbody></table>${gameRuleSections()}<div class="callout"><strong>Not sure where to begin?</strong><span>Try Easy Regular Play first. Use one Hint when you are stuck, then explore the full Solution if you want to study the puzzle structure.</span></div>`
  },
  'daily-challenges':{
    title:'Snapoki Daily Challenges – How Daily Puzzles & Streaks Work',description:'Learn how Snapoki Daily Challenges use shared UTC boards, Easy/Medium/Hard progress and browser-local Daily Streaks.',eyebrow:'Daily Challenges',heading:'A shared puzzle routine, once per day.',intro:'Daily Challenge gives every player the same puzzle seed for a game, difficulty and UTC date.',
    body:`<h2>Three levels per game</h2><p>Each game has an Easy, Medium and Hard Daily board. Completing all three levels is a complete Daily set for that game. The countdown below the board shows when the next UTC day begins.</p><h2>Why UTC?</h2><p>Using one UTC boundary makes the shared board deterministic for everyone. Players in different time zones may see the reset at different local times, but they still receive the same Daily puzzle identified by the same date.</p><h2>Progress stays in this browser</h2><p>Daily completion and Daily Streaks are stored locally in the current browser. There is no account sync. Clearing browser site data or using another browser/device starts with separate Daily progress.</p><h2>Hints, Solutions and Daily boards</h2><p>Hints are available whenever you need one. A full Solution or Guide turns the current board into practice, so that assisted completion does not count toward the Daily set.</p><h2>Daily Streak</h2><p>A Daily Streak represents consecutive UTC dates on which all three Daily difficulties for that game were completed in this browser.</p><div class="content-grid"><div class="content-card"><h3>Easy</h3><p>Warm up and learn the day’s structure.</p></div><div class="content-card"><h3>Medium</h3><p>Adds the game’s main complexity pressure.</p></div><div class="content-card"><h3>Hard</h3><p>Requires the deepest planning or deduction for that engine.</p></div><div class="content-card"><h3>3 / 3</h3><p>Completing all three levels finishes that game’s Daily set.</p></div></div>`
  }
};

let base=await fs.readFile(path.join(dist,'index.html'),'utf8');
for(const [slug,page] of Object.entries(pages)){
  const content=contentPage({eyebrow:page.eyebrow,title:page.heading,intro:page.intro,body:page.body});
  let html=setMeta(base,{title:page.title,description:page.description,slug});
  html=html.replace(/<main>[\s\S]*?<\/main>/,`<main>${content}</main>`).replace(/<body class="[^"]*"/,'<body class="content-shell"');
  const dir=path.join(dist,slug);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),html);
}
