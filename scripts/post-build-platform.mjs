import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const guideColumn='<div class="footer-column"><strong>Guides</strong><a href="/how-to-play/">How to Play</a><a href="/daily-challenges/">Daily Challenges</a><a href="/rankings-guide/">Rankings & Fair Play</a></div>';
const sharedStyles=['platform-extra.css','polish-v3.css','ui-safety.css','progression-v1.css'];

async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}
function polishCopy(html){
  html=html.replaceAll('<span class="eyebrow">Same boards for everyone</span>','');
  html=html.replace('Hiding the solution does not restore ranking eligibility; resetting from the beginning or starting a new puzzle does.','Hiding the solution or resetting the same board does not restore ranking eligibility. Start a New Puzzle to return to ranked play with a fresh verified board.');
  html=html.replace('Use Reset Puzzle to restart from the beginning and restore ranking eligibility when a server-issued ranked attempt is available.','Reset Puzzle lets you practice the same board again, but a board remains practice-only after Solution has been viewed. Use New Puzzle to return to ranked play.');
  html=html.replace('<td>Can restore ranking eligibility with a new verified attempt.</td>','<td>The same board stays practice-only after Solution; New Puzzle returns to ranked play.</td>');
  html=html.replace('A checkpoint cannot be entered early. Undo lets you backtrack one cell at a time.','Regular Play lets you make a contradictory route instead of revealing the correct answer automatically. Conflicting checkpoints are marked so you can reason about the mistake and correct the route directly.');
  html=html.replace('Solution numbers a complete practice sequence.','Solution highlights one shortest set of presses. Those highlighted cells may be pressed in any order, and the guide recalculates from the current board.');
  html=html.replace('Solution steps distinguish completed, current and future guide edges.','Solution shows ghost edges for one valid loop. Draw them in any order; edge order is never part of the rule.');
  html=html.replaceAll('cumulative rankings','personal-best rankings');
  html=html.replaceAll('Cumulative Rankings','Personal-Best Rankings');
  html=html.replaceAll('<span>Cumulative</span>','<span>Best performance</span>');
  html=html.replaceAll('Every verified ranked finish adds Ranking Points. Harder levels and strong performance earn more.','Your strongest verified Regular Play performance sets your rank. Harder levels carry a larger multiplier, but repeat play never farms points.');
  html=html.replaceAll('Every verified ranked finish adds Ranking Points.','Only your best verified Regular Play performance sets your leaderboard score.');
  html=html.replaceAll('verified ranked results, Ranking Points and synced Daily progress','verified personal-best rankings, progression and synced Daily streaks');
  html=html.replaceAll('verified results, Ranking Points and saved Daily progress','verified personal-best rankings, progression and saved Daily streaks');
  html=html.replaceAll('For signed-in ranked play, Snapoki stores verified result information such as the game, difficulty, mode, score, Ranking Points, elapsed time, hints used, play date and limited puzzle metadata needed to operate leaderboards and Daily progress. Guest finishes are not inserted into account Rankings.','For signed-in play, Snapoki stores bounded per-game account state for personal-best Rankings, progression and the current Daily streak. Guest finishes do not update account state.');
  html=html.replaceAll('Some features, including verified Rankings, Ranking Points and account-saved Daily progress, require sign-in.','Some features, including verified personal-best Rankings, progression and account-saved Daily streaks, require sign-in.');
  html=html.replaceAll('<small>RANK PTS</small>','<small>RANK PB</small>');
  html=html.replaceAll('Cumulative Ranking Points','Personal-Best Ranking Score');
  html=html.replaceAll('Each game has its own cumulative leaderboard. Playing more verified games can increase your total, while stronger finishes earn more points per game.','Each game has its own personal-best leaderboard. Only Regular Play affects ranking: a new verified performance replaces your previous ranking score only when it is better.');
  html=html.replaceAll('Daily completion and Daily Streaks are saved to the signed-in Snapoki account. Guest play remains available, but guest finishes are not written into account Daily counters or Rankings.','Daily completion and Daily Streaks are saved to the signed-in Snapoki account. Daily Challenge does not affect the leaderboard; it only updates today’s completion state and streak.');
  html=html.replaceAll('Hints are allowed and reduce the scoring reward. A full Solution or Guide makes that attempt practice-only. Start a New Puzzle when you want a fresh verified ranked attempt.','Hints remain available during Daily Challenge. Daily has no leaderboard score. A full Solution or Guide marks that Daily level as practice-only for the current UTC day.');
  return html;
}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  let html=await fs.readFile(file,'utf8');
  while(html.includes(guideColumn+guideColumn))html=html.replace(guideColumn+guideColumn,guideColumn);
  for(const stylesheet of sharedStyles){const href=`/assets/styles/${stylesheet}`;if(!html.includes(href))html=html.replace('</head>',`<link rel="stylesheet" href="${href}"></head>`);}
  html=polishCopy(html);
  await fs.writeFile(file,html);
}
