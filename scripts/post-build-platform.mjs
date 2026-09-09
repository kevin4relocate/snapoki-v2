import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const guideColumn='<div class="footer-column"><strong>Guides</strong><a href="/how-to-play/">How to Play</a><a href="/daily-challenges/">Daily Challenges</a><a href="/blog/">Puzzle Tips</a></div>';
const sharedStyles=['platform-extra.css','polish-v3.css','ui-safety.css','progression-v1.css'];

async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}
function polishCopy(html){
  html=html.replaceAll('<span class="eyebrow">Same boards for everyone</span>','');
  html=html.replace('Hiding the solution does not restore ranking eligibility; resetting from the beginning or starting a new puzzle does.','Hiding the solution keeps the current board in practice mode. Start a New Puzzle for a fresh board.');
  html=html.replace('Use Reset Puzzle to restart from the beginning and restore ranking eligibility when a server-issued ranked attempt is available.','Reset Puzzle lets you practice the same board again. Use New Puzzle for a fresh board.');
  html=html.replace('<td>Can restore ranking eligibility with a new verified attempt.</td>','<td>Starts a fresh board.</td>');
  html=html.replace('A checkpoint cannot be entered early. Undo lets you backtrack one cell at a time.','Regular Play lets you make a contradictory route instead of revealing the correct answer automatically. Conflicting checkpoints are marked so you can reason about the mistake and correct the route directly.');
  html=html.replace('Solution numbers a complete practice sequence.','Solution highlights one shortest set of presses. Those highlighted cells may be pressed in any order, and the guide recalculates from the current board.');
  html=html.replace('Solution steps distinguish completed, current and future guide edges.','Solution shows ghost edges for one valid loop. Draw them in any order; edge order is never part of the rule.');














  return html;
}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  let html=await fs.readFile(file,'utf8');
  while(html.includes(guideColumn+guideColumn))html=html.replace(guideColumn+guideColumn,guideColumn);
  for(const stylesheet of sharedStyles){const href=`/assets/styles/${stylesheet}`;if(!html.includes(href))html=html.replace('</head>',`<link rel="stylesheet" href="${href}"></head>`);}
  html=polishCopy(html);
  await fs.writeFile(file,html);
}
