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

await patch('echo-step/index.html',html=>{
  if(!html.includes('/assets/styles/echo-step.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/echo-step.css"></head>');
  return html;
});

await patch('index.html',html=>html
  .replace('Play Maze, Number Path, Color Connect, Lights Out and Loop Puzzle online for free','Play Echo Step, Maze, Number Path, Color Connect, Lights Out and Loop Puzzle online for free')
  .replace('Five puzzles.<br>','Six puzzles.<br>')
  .replace('Five ways to think differently','Six ways to think differently')
  .replace('href="/maze/">Play a Game</a>','href="/echo-step/">Play a Game</a>')
  .replace('Yes. All five puzzle games are playable for free in a modern browser.','Yes. All six puzzle games are playable for free in a modern browser.')
);

await patch('about/index.html',html=>html
  .replace('Five distinct puzzle systems','Six distinct puzzle systems')
  .replace('Maze, Number Path, Color Connect, Lights Out and Loop Puzzle each test','Echo Step, Maze, Number Path, Color Connect, Lights Out and Loop Puzzle each test')
);

await patch('how-to-play/index.html',html=>{
  html=html.replace('Learn the rules and controls for Maze, Number Path, Color Connect, Lights Out and Loop Puzzle','Learn the rules and controls for Echo Step, Maze, Number Path, Color Connect, Lights Out and Loop Puzzle');
  if(!html.includes('<h2>Echo Step</h2>'))html=html.replace('<h2>Maze</h2>','<h2>Echo Step</h2><p>Move the purple Player toward the purple goal. Every accepted direction enters a short queue and the cyan Echo repeats that same move after its delay. If the Echo later runs into a blocked cell or the Player, the timeline breaks. When the Player reaches home, movement stops and the Echo automatically catches up. You win only when the Echo reaches the cyan goal with no moves left pending.</p><h2>Maze</h2>');
  return html;
});
