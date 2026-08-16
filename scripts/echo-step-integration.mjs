import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

async function patch(rel,mutate){
  const file=path.join(dist,rel);
  const content=await fs.readFile(file,'utf8');
  await fs.writeFile(file,mutate(content));
}

const echoGuideExtra=`<section data-echo-guide-v31><h2>Why Echo Step is different</h2><p>Every accepted command affects two moments: YOU move immediately, while Echo stores that command and repeats it after the current delay. The puzzle is not just about reaching a goal. It is about making one input sequence work at two moments at once.</p><h2>Read the three striped cell types</h2><ul><li><strong>Purple:</strong> YOU cannot enter; Echo can pass through.</li><li><strong>Cyan:</strong> Echo cannot enter; YOU can pass through.</li><li><strong>Dark:</strong> neither character can enter.</li></ul><p>An invalid move by YOU is simply rejected. Echo is different: it blindly replays your earlier command, so replaying into a cyan or dark cell, off the board, or into YOU means you must Retry.</p><h2>Use Echo Memory as a forecast</h2><p>Echo Memory shows the commands waiting to be replayed. When the queue is full, the oldest command is marked NEXT and the board previews Echo's next target. A red warning means that replay is about to fail.</p><h2>How Hint works</h2><p>Hint reveals a short three-command route instead of a single square. Purple numbered arrows show YOU's next turns. Cyan markers show only the Echo moves that will actually replay during the same forecast, so you can learn the delayed consequence without revealing the full solution.</p><h2>How Guide works</h2><p>Guide restarts the board in practice mode and reveals one NEXT move at a time. Follow each step yourself with keyboard, WASD, or an adjacent-cell click. The run stays practice-only after opening Guide.</p><h2>A practical thinking loop</h2><ol><li>Check where YOU can move now.</li><li>Read Echo Memory and preview Echo's oldest pending move.</li><li>Before committing, ask whether the command is safe for both YOU and Echo.</li><li>Near the goals, time the finish: YOU and Echo must occupy their matching goals on the same turn.</li></ol></section>`;

await patch('echo-step/index.html',html=>{
  for(const stylesheet of ['echo-step.css','echo-step-polish.css','echo-step-rulebar.css']){
    const href=`/assets/styles/${stylesheet}`;
    if(!html.includes(href))html=html.replace('</head>',`<link rel="stylesheet" href="${href}"></head>`);
  }
  return html;
});

await patch('blog/how-to-play-echo-step/index.html',html=>
  html.includes('data-echo-guide-v31')?html:html.replace('</article>',`${echoGuideExtra}</article>`)
);

const echoGuide=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500" role="img" aria-label="Echo Step puzzle preview"><defs><linearGradient id="bg" x1="80" y1="30" x2="820" y2="460"><stop stop-color="#111a31"/><stop offset="1" stop-color="#090e1a"/></linearGradient></defs><rect width="900" height="500" rx="32" fill="#080b14"/><rect x="30" y="30" width="840" height="440" rx="25" fill="url(#bg)" stroke="#283553" stroke-width="2"/><g transform="translate(205 55)">${Array.from({length:36},(_,i)=>{const r=Math.floor(i/6),c=i%6,x=c*82,y=r*68,blocked=[4,8,20,27,31].includes(i);return `<rect x="${x}" y="${y}" width="70" height="56" rx="10" fill="${blocked?'#0a0e18':'#121b30'}" stroke="${blocked?'#253049':'#344462'}"/>${blocked?`<rect x="${x+22}" y="${y+16}" width="26" height="24" rx="6" fill="#64708a" opacity=".20"/>`:''}`;}).join('')}<circle cx="35" cy="28" r="15" fill="#917fff"/><circle cx="199" cy="164" r="15" fill="#5de1ff"/><circle cx="363" cy="368" r="22" fill="none" stroke="#917fff" stroke-width="4" stroke-dasharray="8 7"/><circle cx="527" cy="436" r="22" fill="none" stroke="#5de1ff" stroke-width="4" stroke-dasharray="8 7"/></g><g font-family="system-ui,sans-serif"><text x="72" y="88" fill="#f4f7ff" font-size="30" font-weight="800">Move now.</text><text x="72" y="122" fill="#9aa9c9" font-size="18" font-weight="650">Echo repeats it later.</text><rect x="68" y="156" width="118" height="36" rx="18" fill="#917fff" fill-opacity=".12" stroke="#917fff" stroke-opacity=".40"/><text x="127" y="180" fill="#c8bfff" font-size="14" font-weight="800" text-anchor="middle">YOU</text><rect x="68" y="205" width="118" height="36" rx="18" fill="#5de1ff" fill-opacity=".10" stroke="#5de1ff" stroke-opacity=".36"/><text x="127" y="229" fill="#b9f3ff" font-size="14" font-weight="800" text-anchor="middle">ECHO −2</text></g></svg>`;
await fs.mkdir(path.join(dist,'brand','guides'),{recursive:true});
await fs.writeFile(path.join(dist,'brand','guides','echo-step.svg'),echoGuide);

console.log('Echo Step integration complete: styles, guide content and guide asset.');
