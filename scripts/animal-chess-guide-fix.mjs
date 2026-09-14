import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const guideFile=path.join(root,'dist','blog','how-to-play-animal-chess','index.html');
let html=await fs.readFile(guideFile,'utf8');

const replacements=[
  [
    '<h2>Controls and observation</h2><p>This experience is designed for watching rather than solving. Pause preserves the same distances. Full Screen is the screensaver view. Stop returns to country selection. Restart begins a new endless session from zero with the same countries.</p>',
    '<h2>Controls</h2><p>Play locally with two people or switch to VS CPU and choose Easy, Smart or Expert. Tap or click one of your animals, then choose a highlighted destination. Keyboard players can move board focus with the arrow keys and press Enter to select or move. Undo takes back the previous turn and New Game restores the standard starting position.</p>'
  ],
  [
    '<h2>Endless format</h2><p>There are no rounds and no finish line. Racer distance increases continuously for as long as the page stays running. The scrolling camera keeps the leading pack visible while the underlying distance values continue growing.</p>',
    '<h2>Match format</h2><p>Red moves first. A match ends when one side reaches the enemy den, captures every opposing animal, or leaves the opponent with no legal move. VS CPU uses the same legal-move engine as local play; Expert searches tactical replies more deeply than Smart. Daily Challenges and rankings are not used for Animal Chess.</p>'
  ],
  [
    'Race pace changes absolute speed, comeback pressure and burst strength while preserving the same no-finish-line endless session.',
    'Animal Chess uses one standard 7×9 board. The challenge comes from animal ranks, river access, traps, Lion and Tiger jumps, the special Rat versus Elephant rule and protecting your own den while creating a route into the opponent den.'
  ],
  [
    '<p>Start on Easy to learn the interaction, then move up when the board stops forcing your decisions.</p>',
    '<p>Start with Local 2P or Easy CPU to learn the ranks and terrain. Smart adds stronger tactical choices, while Expert looks ahead through opponent replies before choosing a move.</p>'
  ]
];

for(const[from,to]of replacements){
  if(!html.includes(from))throw new Error(`Animal Chess guide fix could not find expected build text: ${from.slice(0,80)}`);
  html=html.replace(from,to);
}
await fs.writeFile(guideFile,html);

const homeFile=path.join(root,'dist','index.html');
let home=await fs.readFile(homeFile,'utf8');
const homeDescription='Play free browser games on Snapoki, including logic puzzles, Animal Chess and endless simulations. No download or account required.';
for(const [pattern,replacement] of [
  [/<meta name="description" content="[^"]*">/,`<meta name="description" content="${homeDescription}">`],
  [/<meta property="og:description" content="[^"]*">/,`<meta property="og:description" content="${homeDescription}">`],
  [/<meta name="twitter:description" content="[^"]*">/,`<meta name="twitter:description" content="${homeDescription}">`]
]){
  if(!pattern.test(home))throw new Error(`Homepage metadata fix could not find ${pattern}`);
  home=home.replace(pattern,replacement);
}
await fs.writeFile(homeFile,home);
console.log('Animal Chess V4 guide and homepage metadata normalized for launch.');
