import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const guideColumn='<div class="footer-column"><strong>Guides</strong><a href="/how-to-play/">How to Play</a><a href="/daily-challenges/">Daily Challenges</a><a href="/rankings-guide/">Rankings & Fair Play</a></div>';
const statusPattern=/<p id="gameStatus" class="game-status" aria-live="polite">[\s\S]*?<\/p>/g;
const seoPattern=/<section class="section game-seo">[\s\S]*?<\/section>/g;

async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  let html=await fs.readFile(file,'utf8');
  while(html.includes(guideColumn+guideColumn))html=html.replace(guideColumn+guideColumn,guideColumn);
  if(!html.includes('/assets/styles/platform-extra.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/platform-extra.css"></head>');
  if(html.includes('id="gameBoard"')){
    html=html.replace(statusPattern,'');
    html=html.replace(seoPattern,'');
    html=html.replace(/(<div id="gameBoard" class="game-board"[^>]*><\/div>)/,'$1<p id="gameStatus" class="board-feedback" aria-live="polite">Preparing puzzle…</p>');
  }
  await fs.writeFile(file,html);
}
