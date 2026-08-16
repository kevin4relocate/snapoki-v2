import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const ECHO_STEP_PUBLIC=false;

async function patch(rel,mutate){
  const file=path.join(dist,rel);
  let content=await fs.readFile(file,'utf8');
  content=mutate(content);
  await fs.writeFile(file,content);
}
async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const ECHO_GAME_LINK=/<a\b[^>]*href="\/echo-step\/"[^>]*>[\s\S]*?<\/a>/g;
const ECHO_GUIDE_LINK=/<a\b[^>]*href="\/blog\/how-to-play-echo-step\/"[^>]*>[\s\S]*?<\/a>/g;
const ECHO_HEADER_BLOCK=/\n\/echo-step\/\*\n\s+X-Robots-Tag: noindex, nofollow, noarchive\n?/g;
const ECHO_GUIDE_HEADER_BLOCK=/\n\/blog\/how-to-play-echo-step\/\*\n\s+X-Robots-Tag: noindex, nofollow, noarchive\n?/g;
function hideEchoNavigation(html){return html.replace(ECHO_GAME_LINK,'').replace(ECHO_GUIDE_LINK,'');}

const echoSpotlight=`<section class="section daily-home" data-echo-step-spotlight><div class="daily-home-copy"><span class="eyebrow">New puzzle</span><h2>Your moves come back.</h2><p>Echo Step gives one command to two timelines. Move the solid purple YOU now, watch the cyan Echo replay your earlier inputs later, and plan around phase walls that affect each character differently.</p><a class="button button-primary" href="/echo-step/">Play Echo Step</a></div><div class="daily-home-levels"><div><span>01</span><b>YOU</b><small>Move now</small></div><div><span>02</span><b>ECHO</b><small>Repeats later</small></div><div><span>03</span><b>SYNC</b><small>Finish together</small></div></div></section>`;
function publishEchoHomepage(html){
  if(!html.includes('data-echo-step-spotlight'))html=html.replace('<section class="section daily-home">',`${echoSpotlight}<section class="section daily-home">`);
  return html
    .replace('Five puzzles.<br><span>Endless challenges.</span>','Six puzzles.<br><span>Endless challenges.</span>')
    .replace('Five ways to think differently','Six ways to think differently')
    .replace('all five puzzle games','all six puzzle games')
    .replace('Play Maze, Number Path, Color Connect, Lights Out and Loop Puzzle online for free','Play Echo Step, Maze, Number Path, Color Connect, Lights Out and Loop Puzzle online for free');
}

const echoGuideExtra=`<section data-echo-guide-v31><h2>Why Echo Step is different</h2><p>Every accepted command affects two moments: YOU move immediately, while Echo stores that command and repeats it after the current delay. The puzzle is therefore not just about reaching a goal. It is about making one input sequence work on two timelines at once.</p><h2>Read the three wall types first</h2><ul><li><strong>Purple Y wall:</strong> blocks YOU, but Echo may pass through it.</li><li><strong>Cyan E wall:</strong> blocks Echo, but YOU may pass through it.</li><li><strong>Dark wall:</strong> blocks both characters.</li></ul><p>A move can look harmless for YOU and still break the run several turns later when Echo repeats it. That delayed consequence is the central idea of Echo Step.</p><h2>Use Echo Memory as a forecast</h2><p>Echo Memory shows the commands waiting to be replayed. When the queue is full, the oldest command is marked NEXT and the board previews Echo's next target. A warning state means that replay is about to collide with a cyan wall, dark wall, the edge of the board, or YOU.</p><h2>How the Hint works</h2><p>Hint reveals a short three-command route instead of a single square. Purple numbered arrows show YOU's next turns. Cyan E-markers show only the Echo moves that will actually replay during the same short forecast, so you can learn how present movement becomes a delayed consequence without revealing the full solution.</p><h2>A practical thinking loop</h2><ol><li>Check where YOU can move now.</li><li>Read the oldest command in Echo Memory and preview where Echo will move next.</li><li>Before committing, ask whether the same direction is safe for both timelines.</li><li>Near the goals, stop thinking about arrival alone: YOU and Echo must occupy their matching goals on the same turn.</li></ol></section>`;
async function enrichEchoGuide(){
  await patch('blog/how-to-play-echo-step/index.html',html=>{
    if(!html.includes('data-echo-guide-v31'))html=html.replace('</article>',`${echoGuideExtra}</article>`);
    return html;
  });
}

if(!ECHO_STEP_PUBLIC){
  for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
    const html=await fs.readFile(file,'utf8');
    await fs.writeFile(file,hideEchoNavigation(html));
  }
}else{
  await patch('index.html',publishEchoHomepage);
  await patch('_headers',headers=>headers.replace(ECHO_HEADER_BLOCK,'\n').replace(ECHO_GUIDE_HEADER_BLOCK,'\n'));
}

await patch('echo-step/index.html',html=>{
  if(!html.includes('/assets/styles/echo-step.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/echo-step.css"></head>');
  if(!html.includes('/assets/styles/echo-step-polish.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/echo-step-polish.css"></head>');
  if(!html.includes('/assets/styles/echo-step-rulebar.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/echo-step-rulebar.css"></head>');
  return html;
});
await enrichEchoGuide();

const echoGuide=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500" role="img" aria-label="Echo Step puzzle preview"><defs><linearGradient id="bg" x1="80" y1="30" x2="820" y2="460"><stop stop-color="#111a31"/><stop offset="1" stop-color="#090e1a"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="900" height="500" rx="32" fill="#080b14"/><rect x="30" y="30" width="840" height="440" rx="25" fill="url(#bg)" stroke="#283553" stroke-width="2"/><g transform="translate(205 55)">${Array.from({length:36},(_,i)=>{const r=Math.floor(i/6),c=i%6,x=c*82,y=r*68,blocked=[4,8,20,27,31].includes(i);return `<rect x="${x}" y="${y}" width="70" height="56" rx="10" fill="${blocked?'#0a0e18':'#121b30'}" stroke="${blocked?'#253049':'#344462'}"/>${blocked?`<rect x="${x+22}" y="${y+16}" width="26" height="24" rx="6" fill="#64708a" opacity=".20"/>`:''}`;}).join('')}<circle cx="35" cy="28" r="15" fill="#917fff"/><circle cx="199" cy="164" r="15" fill="#5de1ff"/><circle cx="363" cy="368" r="22" fill="none" stroke="#917fff" stroke-width="4" stroke-dasharray="8 7"/><circle cx="527" cy="436" r="22" fill="none" stroke="#5de1ff" stroke-width="4" stroke-dasharray="8 7"/><g fill="none" stroke="#917fff" stroke-width="5" opacity=".28" stroke-linecap="round"><path d="M35 28H117V96H199V164H281"/></g><g fill="none" stroke="#5de1ff" stroke-width="5" opacity=".24" stroke-linecap="round"><path d="M199 164H281V232H363V300H445"/></g></g><g font-family="system-ui,sans-serif"><text x="72" y="88" fill="#f4f7ff" font-size="30" font-weight="800">Move now.</text><text x="72" y="122" fill="#9aa9c9" font-size="18" font-weight="650">Echo repeats it later.</text><rect x="68" y="156" width="118" height="36" rx="18" fill="#917fff" fill-opacity=".12" stroke="#917fff" stroke-opacity=".40"/><text x="127" y="180" fill="#c8bfff" font-size="14" font-weight="800" text-anchor="middle">YOU</text><rect x="68" y="205" width="118" height="36" rx="18" fill="#5de1ff" fill-opacity=".10" stroke="#5de1ff" stroke-opacity=".36"/><text x="127" y="229" fill="#b9f3ff" font-size="14" font-weight="800" text-anchor="middle">ECHO −2</text></g></svg>`;
await fs.mkdir(path.join(dist,'brand','guides'),{recursive:true});
await fs.writeFile(path.join(dist,'brand','guides','echo-step.svg'),echoGuide);
