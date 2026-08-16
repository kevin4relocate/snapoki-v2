import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

function replaceRequired(text,from,to,label){
  if(!text.includes(from))throw new Error(`Echo message polish target missing: ${label}`);
  return text.replace(from,to);
}

const jsPath=path.join(dist,'assets','js','games','echo-step-ui-v32.js');
let js=await fs.readFile(jsPath,'utf8');

// One message rule: say what happened + what to do next. No jargon, no timed state messages.
js=replaceRequired(js,"if(duration>0){noticeTimer=setTimeout","if(duration>0&&type!=='blocked'){noticeTimer=setTimeout",'blocked message persistence');
js=replaceRequired(js,"if(message==='That move leaves the board.')return['Move blocked',\"YOU can’t leave the board.\"];","if(message==='That move leaves the board.')return[\"YOU can’t move off the board.\",'Choose another direction.'];",'off-board YOU message');
js=replaceRequired(js,"if(message==='That move hits a dark wall.')return['Move blocked','Dark cell — nobody can enter.'];","if(message==='That move hits a dark wall.')return[\"YOU can’t enter dark cells.\",'Choose another direction.'];",'dark YOU message');
js=replaceRequired(js,"if(message==='Purple phase wall: YOU cannot cross it.')return['Move blocked','Purple cell — YOU cannot enter.'];","if(message==='Purple phase wall: YOU cannot cross it.')return[\"YOU can’t enter purple cells.\",'Choose another direction.'];",'purple YOU message');
js=replaceRequired(js,"if(message==='Echo is occupying that cell.')return['Move blocked','Echo is occupying that cell.'];","if(message==='Echo is occupying that cell.')return['Echo is in that cell.','Choose another direction.'];",'occupied YOU message');
js=replaceRequired(js,"return['Move blocked',message];","return[\"That move can’t be made.\",'Choose another direction.'];",'generic YOU message');
js=replaceRequired(js,'<small>${puzzle.delay}-turn delay</small>','<small>${puzzle.delay} turns later</small>','compact Echo delay copy');
js=replaceRequired(js,'<span class="echo-rule-separator" aria-hidden="true"></span>','<div class="echo-goal-strip" aria-label="Goal: YOU to P and Echo to E on the same turn"><b>GOAL</b><span class="echo-goal-you">YOU → P</span><span class="echo-goal-divider" aria-hidden="true">|</span><span class="echo-goal-echo">ECHO → E</span><em>SAME TURN</em></div><span class="echo-rule-separator" aria-hidden="true"></span>','always-visible goal mapping');
js=replaceRequired(js,'<div class="echo-timeline"><span>Echo memory</span>','<div class="echo-timeline"><span>Echo will replay</span>','plain Echo queue label');
js=replaceRequired(js,"banner.className='echo-state-banner is-waiting-player';banner.innerHTML='<div><strong>P reached — not synced yet</strong><span>Echo must be on E on the same turn.</span></div>';return;","banner.className='echo-state-banner is-waiting-player';banner.innerHTML=\"<div><strong>YOU reached P.</strong><span>Echo isn’t at E yet. Keep moving and return to P when Echo reaches E.</span></div>\";return;",'player goal waiting copy');
js=replaceRequired(js,"banner.className='echo-state-banner is-waiting-echo';banner.innerHTML='<div><strong>Echo reached E — not synced yet</strong><span>YOU must be on P on the same turn.</span></div>';return;","banner.className='echo-state-banner is-waiting-echo';banner.innerHTML=\"<div><strong>Echo reached E.</strong><span>Reach P while Echo is still on E.</span></div>\";return;",'Echo goal waiting copy');
js=replaceRequired(js,'<span>Try a different route.</span>','<span>Try another path in this puzzle.</span>','Retry means same puzzle');
js=replaceRequired(js,
  "const echoPreview=nextEchoPreview(),guide=practiceStep(),hintPlayerGuide=hintForecast?stepGuide(hintForecast.playerSteps):new Map(),hintEchoGuide=hintForecast?stepGuide(hintForecast.echoSteps):new Map();",
  "const echoPreview=nextEchoPreview(),guide=practiceStep(),hintPlayerGuide=hintForecast?stepGuide(hintForecast.playerSteps):new Map(),hintEchoGuide=hintForecast?stepGuide(hintForecast.echoSteps):new Map(),showGoalCue=difficulty==='easy'&&moves===0&&!solutionVisible&&!failed&&!complete;",
  'Easy goal onboarding state');
js=replaceRequired(js,
  "if(index===puzzle.playerGoal)cell.classList.add('player-goal');if(index===puzzle.echoGoal)cell.classList.add('echo-goal');if(index===state.player)cell.classList.add('has-player');if(index===state.echo)cell.classList.add('has-echo');",
  "if(index===puzzle.playerGoal){cell.classList.add('player-goal');cell.title=\"P — YOU's goal\";if(showGoalCue)cell.classList.add('goal-onboarding-player');}if(index===puzzle.echoGoal){cell.classList.add('echo-goal');cell.title=\"E — Echo's goal\";if(showGoalCue)cell.classList.add('goal-onboarding-echo');}if(index===state.player)cell.classList.add('has-player');if(index===state.echo)cell.classList.add('has-echo');",
  'goal identity and Easy onboarding classes');
js=replaceRequired(js,
  "if(index===puzzle.playerGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-player';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===puzzle.echoGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-ghost';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);}if(index===state.player){const token=document.createElement('span');token.className='echo-agent echo-agent-player';token.textContent='YOU';cell.appendChild(token);}if(index===state.echo){const token=document.createElement('span');token.className='echo-agent echo-agent-ghost';token.textContent='E';token.setAttribute('aria-label','Echo');cell.appendChild(token);}",
  "if(index===puzzle.playerGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-player';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);if(showGoalCue){const cue=document.createElement('span');cue.className='echo-goal-cue echo-goal-cue-you';cue.textContent='YOU → P';cue.setAttribute('aria-hidden','true');cell.appendChild(cue);}}if(index===puzzle.echoGoal){const goal=document.createElement('span');goal.className='echo-goal-mark echo-goal-ghost';goal.setAttribute('aria-hidden','true');cell.appendChild(goal);if(showGoalCue){const cue=document.createElement('span');cue.className='echo-goal-cue echo-goal-cue-echo';cue.textContent='ECHO → E';cue.setAttribute('aria-hidden','true');cell.appendChild(cue);}}if(index===state.player){const token=document.createElement('span');token.className='echo-agent echo-agent-player';token.textContent='YOU';cell.appendChild(token);}if(index===state.echo){const token=document.createElement('span');token.className='echo-agent echo-agent-ghost';token.textContent='E';token.setAttribute('aria-label','Echo');cell.appendChild(token);}",
  'Easy goal onboarding labels');
js=js.replace("practiceMessage=`Follow NEXT: ${DIRS[expected]?.arrow||''} ${DIRS[expected]?.label||''}.`;","practiceMessage=`Follow the highlighted NEXT cell: ${DIRS[expected]?.arrow||''} ${DIRS[expected]?.label||''}.`;");
await fs.writeFile(jsPath,js);

// Remove leftover internal-language wording and make the in-game help goal-first.
for(const rel of ['echo-step/index.html','blog/how-to-play-echo-step/index.html']){
  const file=path.join(dist,rel);
  let html=await fs.readFile(file,'utf8');
  if(rel==='echo-step/index.html'){
    html=html
      .replaceAll('You control the solid purple YOU token. Every accepted direction is stored and repeated by the translucent cyan Echo after the displayed delay.','<span class="echo-help-goal"><strong>Goal:</strong> Get <b class="echo-help-you">YOU</b> to <b class="echo-help-you">P</b> and <b class="echo-help-echo">Echo</b> to <b class="echo-help-echo">E</b> on the <strong>same turn</strong>.</span>')
      .replaceAll('Purple striped cells stop YOU but not Echo. Cyan striped cells stop Echo but not YOU. Dark cells stop both.','<strong>Move:</strong> Control <b class="echo-help-you">YOU</b>. <b class="echo-help-echo">Echo</b> repeats each accepted move after the delay shown above the board.')
      .replaceAll('Reaching the purple goal by yourself does not finish the puzzle. If Echo is not on the cyan goal yet, keep moving and time your return.','<strong>Walls:</strong> Purple stops YOU only. Cyan stops Echo only. Dark stops both.')
      .replaceAll('YOU win only when YOU and Echo occupy their matching goals on the same turn. A blocked YOU move is rejected; if Echo replays into a cyan or dark cell, leaves the board, or collides with YOU, the timeline fails. Hint forecasts three moves; Guide teaches the solution one step at a time.','<strong>Finish:</strong> YOU and Echo must be on P and E together. If YOU cannot enter a cell, choose another direction. If Echo hits a cyan or dark cell, goes off the board, or hits YOU, use Retry. Hint shows three moves; Guide teaches one step at a time.');
  }
  html=html
    .replaceAll('the timeline fails','you must Retry')
    .replaceAll('ends the timeline','you must Retry')
    .replaceAll('ends the timeline.','you must Retry.')
    .replaceAll('two timelines at once','two moments at once')
    .replaceAll('two timelines','two moments')
    .replaceAll('timeline breaks','run ends');
  await fs.writeFile(file,html);
}

// Messages overlay the rule rows instead of taking layout space, so the board never jumps.
const cssPath=path.join(dist,'assets','styles','echo-step-rulebar.css');
let css=await fs.readFile(cssPath,'utf8');
const marker='/* V3.7 state-driven plain-language overlays */';
if(!css.includes(marker))css+=`\n${marker}\n.echo-stage{position:relative}\n.echo-compact-bar{min-height:46px}\n.echo-stage>.echo-state-banner{position:absolute;left:0;right:0;top:0;z-index:80;width:100%;min-height:44px;margin:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.28);backdrop-filter:blur(10px)}\n.echo-stage>.echo-state-banner[hidden]{display:none!important}\n.echo-stage>.echo-state-banner>div{display:flex;align-items:center;gap:7px;min-width:0;flex:1}\n.echo-stage>.echo-state-banner strong{font-size:11px;white-space:nowrap}\n.echo-stage>.echo-state-banner span{font-size:10px;line-height:1.25;min-width:0}\n.echo-stage>.echo-state-banner button{flex:0 0 auto;padding:7px 11px;font-size:9px}\n@media(max-width:760px){.echo-compact-bar{min-height:56px}.echo-stage>.echo-state-banner{min-height:54px;padding:7px 9px}.echo-stage>.echo-state-banner>div{display:grid;gap:2px}.echo-stage>.echo-state-banner strong{font-size:10px;white-space:normal}.echo-stage>.echo-state-banner span{font-size:9px}.echo-stage>.echo-state-banner button{padding:7px 9px}}\n`;
await fs.writeFile(cssPath,css);
