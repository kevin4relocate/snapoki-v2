import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

async function patch(rel,mutate){
  const file=path.join(dist,rel);
  let html=await fs.readFile(file,'utf8');
  html=mutate(html);
  await fs.writeFile(file,html);
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
function hideEchoNavigation(html){return html.replace(ECHO_GAME_LINK,'').replace(ECHO_GUIDE_LINK,'');}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  const html=await fs.readFile(file,'utf8');
  await fs.writeFile(file,hideEchoNavigation(html));
}

await patch('echo-step/index.html',html=>{
  if(!html.includes('/assets/styles/echo-step.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/echo-step.css"></head>');
  return html;
});

const echoGuide=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500" role="img" aria-label="Echo Step puzzle preview"><defs><linearGradient id="bg" x1="80" y1="30" x2="820" y2="460"><stop stop-color="#111a31"/><stop offset="1" stop-color="#090e1a"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="900" height="500" rx="32" fill="#080b14"/><rect x="30" y="30" width="840" height="440" rx="25" fill="url(#bg)" stroke="#283553" stroke-width="2"/><g transform="translate(205 55)">${Array.from({length:36},(_,i)=>{const r=Math.floor(i/6),c=i%6,x=c*82,y=r*68,blocked=[4,8,20,27,31].includes(i);return `<rect x="${x}" y="${y}" width="70" height="56" rx="10" fill="${blocked?'#0a0e18':'#121b30'}" stroke="${blocked?'#253049':'#344462'}"/>${blocked?`<rect x="${x+22}" y="${y+16}" width="26" height="24" rx="6" fill="#64708a" opacity=".20"/>`:''}`;}).join('')}<circle cx="35" cy="28" r="15" fill="#917fff"/><circle cx="199" cy="164" r="15" fill="#5de1ff"/><circle cx="363" cy="368" r="22" fill="none" stroke="#917fff" stroke-width="4" stroke-dasharray="8 7"/><circle cx="527" cy="436" r="22" fill="none" stroke="#5de1ff" stroke-width="4" stroke-dasharray="8 7"/><g fill="none" stroke="#917fff" stroke-width="5" opacity=".28" stroke-linecap="round"><path d="M35 28H117V96H199V164H281"/></g><g fill="none" stroke="#5de1ff" stroke-width="5" opacity=".24" stroke-linecap="round"><path d="M199 164H281V232H363V300H445"/></g></g><g font-family="system-ui,sans-serif"><text x="72" y="88" fill="#f4f7ff" font-size="30" font-weight="800">Move now.</text><text x="72" y="122" fill="#9aa9c9" font-size="18" font-weight="650">Echo repeats it later.</text><rect x="68" y="156" width="118" height="36" rx="18" fill="#917fff" fill-opacity=".12" stroke="#917fff" stroke-opacity=".40"/><text x="127" y="180" fill="#c8bfff" font-size="14" font-weight="800" text-anchor="middle">YOU</text><rect x="68" y="205" width="118" height="36" rx="18" fill="#5de1ff" fill-opacity=".10" stroke="#5de1ff" stroke-opacity=".36"/><text x="127" y="229" fill="#b9f3ff" font-size="14" font-weight="800" text-anchor="middle">ECHO −2</text></g></svg>`;
await fs.mkdir(path.join(dist,'brand','guides'),{recursive:true});
await fs.writeFile(path.join(dist,'brand','guides','echo-step.svg'),echoGuide);
