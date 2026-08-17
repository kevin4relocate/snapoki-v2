import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const referencePages=new Set(['how-to-play/index.html','daily-challenges/index.html','rankings-guide/index.html']);
const contentLink='<link rel="stylesheet" href="/assets/styles/content.css">';
const launchLink='<link rel="stylesheet" href="/assets/styles/launch.css">';
const boardStatusLink='<link rel="stylesheet" href="/assets/styles/board-status.css">';

async function htmlFiles(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await htmlFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);
  }
  return out;
}
function replaceRequired(text,from,to,label){
  if(!text.includes(from))throw new Error(`UI safety patch target missing: ${label}`);
  return text.replace(from,to);
}
function ensureContentStyleOrder(html){
  if(!html.includes('class="content-page'))return html;
  if(!html.includes(contentLink))return html.includes(launchLink)?html.replace(launchLink,contentLink+launchLink):html.replace('</head>',contentLink+'</head>');
  if(html.includes(launchLink)&&html.indexOf(contentLink)>html.indexOf(launchLink)){html=html.replace(contentLink,'');html=html.replace(launchLink,contentLink+launchLink);}
  return html;
}

for(const file of await htmlFiles(dist)){
  let html=await fs.readFile(file,'utf8');
  const rel=path.relative(dist,file).split(path.sep).join('/');
  html=html.replaceAll('<span class="eyebrow">Same boards for everyone</span>','');
  if(referencePages.has(rel)&&html.includes('class="content-page"'))html=html.replace('class="content-page"','class="content-page reference-page"');
  html=ensureContentStyleOrder(html);
  if(!html.includes('/assets/styles/ui-safety.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/ui-safety.css"></head>');
  if(html.includes('id="gameBoard"')&&!html.includes('/assets/styles/board-status.css'))html=html.replace('</head>',`${boardStatusLink}</head>`);
  await fs.writeFile(file,html);
}

const gamePageAsset=path.join(dist,'assets','js','game-page.js');
try{
  let js=await fs.readFile(gamePageAsset,'utf8');
  js=js.replaceAll(' · EXPERT','');
  js=replaceRequired(js,
    "function metricElement(k){return document.querySelector(`[data-metric-value=\"${k}\"]`);}function setMetric(k,v){const e=metricElement(k);if(e)e.textContent=String(v);}function setMetrics(v={}){Object.entries(v).forEach(([k,x])=>setMetric(k,x));}function setStatus(t){const e=$('#gameStatus');if(e)e.textContent=t||'';}function modeName()",
    "function metricElement(k){return document.querySelector(`[data-metric-value=\"${k}\"]`);}function setMetric(k,v){const e=metricElement(k);if(e)e.textContent=String(v);}function setMetrics(v={}){Object.entries(v).forEach(([k,x])=>setMetric(k,x));}function setStatus(t){const e=$('#gameStatus');if(!e)return;let text=t||'';if((gameKey==='maze'&&text==='Reach the green finish. Hard boards hide the correct route behind deeper branch traps and tighter decisions.')||(gameKey==='number-path'&&text==='Start at 1. Checkpoints must match their exact path step. Regular Play allows contradictions so you can reason, notice them and Undo yourself.'))text='';const progress=gameKey==='number-path'?text.match(/^Step (\\d+) of (\\d+)\\. Next checkpoint: (\\d+)\\.$/):null;e.classList.toggle('is-progress',Boolean(progress));e.hidden=!text;if(progress){e.innerHTML=`<span class=\"board-progress-step\">Step <b>${progress[1]}</b> / ${progress[2]}</span><span class=\"board-progress-next\">Next checkpoint <b>${progress[3]}</b></span>`;}else e.textContent=text;}function modeName()",
    'shared board status presentation');
  js=replaceRequired(js,
    "const state={difficulty:game.levels[0][0],mode:'normal',seed:'',runId:'',ranked:false,unrankedReason:'',startedAt:0,timer:null,engine:null,engineFactory:null,loading:false,completed:false",
    "const state={difficulty:game.levels[0][0],mode:'normal',seed:'',runId:'',ranked:false,unrankedReason:'',startedAt:0,timer:null,engine:null,engineFactory:null,engineLocked:false,loading:false,completed:false",
    'engineLocked state');
  js=replaceRequired(js,
    "function updateControlAvailability(){const ready=Boolean(state.engine)&&!state.loading,done=state.completed,reviewLocked=Boolean(review);setDisabled('#newPuzzle',state.loading);setDisabled('#hint',!capability('hint')||!ready||done||state.solutionVisible);setDisabled('#solution',!capability('solution')||!ready||done);setDisabled('#resetPuzzle',!ready||(done&&!state.practiceComplete));setDisabled('#undoAction',!capability('undo')||!ready||done);",
    "function updateControlAvailability(){const ready=Boolean(state.engine)&&!state.loading,done=state.completed,locked=Boolean(state.engineLocked),reviewLocked=Boolean(review);setDisabled('#newPuzzle',state.loading);setDisabled('#hint',!capability('hint')||!ready||done||locked||state.solutionVisible);setDisabled('#solution',!capability('solution')||!ready||done||locked);setDisabled('#resetPuzzle',!ready||(done&&!state.practiceComplete));setDisabled('#undoAction',!capability('undo')||!ready||done||locked);",
    'terminal control lock');
  js=replaceRequired(js,
    "function tick(){const ms=elapsed();setMetric('time',formatTime(ms));if(state.engine?.previewScore&&metricElement('score'))setMetric('score',Number(state.engine.previewScore(ms,state.hints)).toLocaleString());}",
    "function tick(){if(state.engineLocked||state.completed)return;const ms=elapsed();setMetric('time',formatTime(ms));if(state.engine?.previewScore&&metricElement('score'))setMetric('score',Number(state.engine.previewScore(ms,state.hints)).toLocaleString());}",
    'terminal timer and score freeze');
  js=replaceRequired(js,"state.engine?.destroy?.();state.engine=null;state.loading=true;","state.engine?.destroy?.();state.engine=null;state.engineLocked=false;state.loading=true;",'new puzzle unlock');
  js=replaceRequired(js,"b.textContent=visible?'Hide Solution':'Solution';","b.textContent=gameKey==='echo-step'?(visible?'Exit Guide':'Guide'):(visible?'Hide Solution':'Solution');",'Echo Guide label');
  js=replaceRequired(js,
    "function setSmartNext(action){state.smartNext=action||null;const next=$('#resultNext');if(!next)return;next.hidden=false;next.textContent=action?.label?`${action.label} →`:'Next Challenge →';}",
    "function setSmartNext(action){state.smartNext=action||null;const next=$('#resultNext');if(!next)return;next.hidden=!action;if(!action)return;next.textContent=action.label?`${action.label} →`:'Next Challenge →';}",
    'result next action visibility');
  js=replaceRequired(js,"replay?'+0 pts':hasAccount()?'Unranked':'Sign in';","replay?'+0 pts':hasAccount()?'Unranked':'—';",'guest rank points');
  const lockListener="window.addEventListener('snapoki:game-lock',event=>{if(event.detail?.game!==game.key)return;state.engineLocked=Boolean(event.detail?.locked);if(state.engineLocked)stopTimer();updateControlAvailability();});";
  if(!js.includes('snapoki:game-lock'))js=replaceRequired(js,'init();',`${lockListener}\ninit();`,'game lock listener');
  await fs.writeFile(gamePageAsset,js);
}catch(error){if(error?.code!=='ENOENT')throw error;}
