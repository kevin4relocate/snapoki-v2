import {getGame} from './games-config.js';
import {api,post,makeRunId,ApiError} from './api.js';
import {dailySeed,randomSeed,formatTime} from './games/utils.js';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const gameKey=document.body.dataset.game;
const game=getGame(gameKey);
if(!game)throw new Error(`Unknown Snapoki game: ${gameKey}`);

const state={
  difficulty:game.levels[0][0],mode:'normal',seed:'',runId:'',ranked:false,startedAt:0,timer:null,
  engine:null,engineFactory:null,completed:false,hints:0,solutionUsed:false,solutionVisible:false,lastFocused:null,dailyCompleted:[]
};

function metricElement(k){return document.querySelector(`[data-metric-value="${k}"]`);}
function setMetric(k,v){const e=metricElement(k);if(e)e.textContent=String(v);}
function setMetrics(v={}){Object.entries(v).forEach(([k,x])=>setMetric(k,x));}
function setStatus(t){const e=$('#gameStatus');if(e)e.textContent=t;}
function modeName(){return state.mode==='daily'?'Daily Challenge':'Regular Play';}
function hasAccount(){return Boolean(window.SnapokiAuth?.user);}
function runLabel(){if(state.solutionUsed)return'Practice';if(state.ranked)return modeName();return hasAccount()?`${modeName()} · Unranked`:`${modeName()} · Guest`;}
function updateActiveControls(){
  $$('.difficulty-button').forEach(b=>b.classList.toggle('active',b.dataset.difficulty===state.difficulty));
  $$('.mode-button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  const label=$('#boardModeLabel');if(label)label.textContent=runLabel();
}
function stopTimer(){if(state.timer)clearInterval(state.timer);state.timer=null;}
function elapsed(){return state.startedAt?Math.max(0,Date.now()-state.startedAt):0;}
function tick(){const ms=elapsed();setMetric('time',formatTime(ms));if(state.engine?.previewScore&&metricElement('score'))setMetric('score',Number(state.engine.previewScore(ms,state.hints)).toLocaleString());}
function beginTimer(){stopTimer();state.startedAt=Date.now();tick();state.timer=setInterval(tick,250);}
function guestSeed(reuseSeed=false,previousSeed=''){if(reuseSeed&&previousSeed)return previousSeed;return state.mode==='daily'?dailySeed(game.key,state.difficulty):randomSeed(game.key,state.difficulty);}
async function waitForAuth(){
  try{if(window.SnapokiAuthReady)await window.SnapokiAuthReady;}catch{}
  if(window.SnapokiAuth?.ready)return window.SnapokiAuth;
  await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;window.removeEventListener('snapoki:auth-changed',finish);resolve();};window.addEventListener('snapoki:auth-changed',finish,{once:true});setTimeout(finish,1800);});
  return window.SnapokiAuth||{user:null,ready:false};
}
async function rankedAttempt(cloneRunId=''){
  await waitForAuth();if(!hasAccount())return null;
  try{return await post('/api/runs/start',{game:game.key,difficulty:state.difficulty,mode:state.mode,...(cloneRunId?{clone_run_id:cloneRunId}:{})});}
  catch(error){console.warn('Ranked attempt unavailable',error);return null;}
}
async function loadEngineFactory(){if(state.engineFactory)return state.engineFactory;const module=await import(`/assets/js/games/${game.slug}.js`);if(typeof module.createGame!=='function')throw new Error(`${game.name} engine is missing createGame().`);state.engineFactory=module.createGame;return state.engineFactory;}
function resetMetricDefaults(){for(const[key]of game.metrics)setMetric(key,key==='time'?'00:00':'0');setMetric('hints','0');if(metricElement('score'))setMetric('score','5,000');}
function setPracticeUi(used=state.solutionUsed,visible=state.solutionVisible){
  $('.board-panel')?.classList.toggle('practice-mode',used);
  const b=$('#solution');if(b){b.textContent=visible?'Hide Solution':'Solution';b.setAttribute('aria-pressed',String(visible));}
  updateActiveControls();
}

async function startPuzzle({reuseSeed=false}={}){
  const previousSeed=state.seed,previousRunId=state.runId;
  closeResult(false);state.engine?.destroy?.();state.engine=null;state.completed=false;state.hints=0;state.solutionUsed=false;state.solutionVisible=false;state.ranked=false;setPracticeUi(false,false);
  resetMetricDefaults();updateActiveControls();setStatus('Preparing puzzle…');$('#gameBoard')?.setAttribute('aria-busy','true');
  try{
    const attempt=await rankedAttempt(reuseSeed?previousRunId:'');
    if(attempt?.run_id&&attempt?.seed){state.seed=attempt.seed;state.runId=attempt.run_id;state.ranked=true;}
    else{state.seed=guestSeed(reuseSeed,previousSeed);state.runId=makeRunId(game.key);state.ranked=false;}
    updateActiveControls();
    const createGame=await loadEngineFactory();
    state.engine=createGame({host:$('#gameBoard'),difficulty:state.difficulty,mode:state.mode,seed:state.seed,onMetrics:setMetrics,onStatus:setStatus,onComplete:finishPuzzle});
    const undo=$('#undoAction');if(undo)undo.hidden=!state.engine.supportsUndo;
    beginTimer();
    if(!state.ranked&&hasAccount())setStatus('Puzzle ready. Ranked verification is temporarily unavailable; this attempt will not affect Rankings.');
  }catch(error){console.error(error);setStatus('This puzzle could not start. Please try New Puzzle.');}
  finally{$('#gameBoard')?.removeAttribute('aria-busy');}
}

async function resetAttempt(){
  if(!state.engine)return;const previousRunId=state.runId;
  state.completed=false;state.hints=0;state.solutionUsed=false;state.solutionVisible=false;state.ranked=false;
  if(hasAccount()&&previousRunId){const attempt=await rankedAttempt(previousRunId);if(attempt?.run_id&&attempt.seed===state.seed){state.runId=attempt.run_id;state.ranked=true;}else state.runId=makeRunId(game.key);}else state.runId=makeRunId(game.key);
  state.engine.reset?.();setMetric('hints','0');setPracticeUi(false,false);beginTimer();
  setStatus(state.ranked?'Puzzle reset from the beginning. Ranking eligibility is active again.':hasAccount()?'Puzzle reset. Start a New Puzzle if ranked verification remains unavailable.':'Puzzle reset. Sign in before starting a new puzzle to join Rankings.');
}
function nextDifficulty(){const i=game.levels.findIndex(([k])=>k===state.difficulty);return game.levels[i+1]?.[0]||null;}
function setDifficulty(d,start=true){if(!game.levels.some(([k])=>k===d))return;state.difficulty=d;updateActiveControls();if(start)startPuzzle();}
function setMode(m,start=true){if(!['normal','daily'].includes(m))return;state.mode=m;updateActiveControls();if(start)startPuzzle();}
function difficultyLabel(){return game.levels.find(([k])=>k===state.difficulty)?.[1]||state.difficulty;}

function resultFocusables(){const modal=$('#resultModal');return modal?$$('button,[href],[tabindex]:not([tabindex="-1"])',modal).filter(el=>!el.hidden&&!el.disabled):[];}
function openResult(result){
  const modal=$('#resultModal');if(!modal)return;state.lastFocused=document.activeElement;
  $('#resultGameName').textContent=`${game.name} Complete!`;$('#resultScore').textContent=Number(result.score||0).toLocaleString();$('#resultDifficulty').textContent=`${difficultyLabel()} · ${modeName()}`;$('#resultTime').textContent=formatTime(result.time_ms);$('#resultHints').textContent=String(state.hints);$('#resultMode').textContent=modeName();$('#resultRankPoints').textContent=state.ranked?'Saving…':hasAccount()?'Unranked':'Sign in';
  const next=$('#resultNext'),nextKey=nextDifficulty();if(next){next.hidden=!nextKey;if(nextKey)next.textContent=`Next: ${game.levels.find(([k])=>k===nextKey)[1]} →`;}
  const status=$('#resultSaveStatus');status.className='result-save-status';status.textContent=state.ranked?'Verifying this account-bound ranked attempt…':hasAccount()?'This attempt is not eligible for Rankings.':'Guest finish. Sign in, then start a new puzzle to join Rankings.';modal.hidden=false;document.body.classList.add('modal-open');$('#resultClose')?.focus();
}
function closeResult(restore=true){const modal=$('#resultModal');if(!modal||modal.hidden)return;modal.hidden=true;document.body.classList.remove('modal-open');if(restore)state.lastFocused?.focus?.();}
async function saveResult(result){
  const status=$('#resultSaveStatus');if(!state.ranked)return;
  try{const saved=await post('/api/results',result);$('#resultScore').textContent=Number(saved.score||0).toLocaleString();$('#resultRankPoints').textContent=`+${Number(saved.ranking_points||0)} pts`;status.classList.add('success');status.textContent=saved.duplicate?'This verified result was already saved.':'Verified ranked result saved to your account.';if(state.mode==='daily'&&!state.dailyCompleted.includes(state.difficulty)){state.dailyCompleted=[...state.dailyCompleted,state.difficulty];renderDaily();}await refreshRail();}
  catch(error){if(error instanceof ApiError&&error.status===401){$('#resultRankPoints').textContent='Sign in';status.classList.add('muted');status.textContent='Your session ended. Sign in and start a new puzzle to rank.';}else if(error instanceof ApiError&&[409,410,422].includes(error.status)){$('#resultRankPoints').textContent='Not ranked';status.classList.add('error');status.textContent='This attempt could not be verified for Rankings. Start a new puzzle and try again.';}else{$('#resultRankPoints').textContent='Not saved';status.classList.add('error');status.textContent='Online verification is temporarily unavailable. Your game can continue.';console.warn(error);}}
}

function renderDaily(){const done=state.dailyCompleted;$('#dailyProgress').textContent=`${done.length} of 3 completed`;$$('.daily-level').forEach(b=>{const complete=done.includes(b.dataset.difficulty);b.classList.toggle('complete',complete);b.setAttribute('aria-label',`${b.textContent.trim()}${complete?', completed':''}`);});}
function updateCountdown(){const now=new Date(),next=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1),seconds=Math.max(0,Math.floor((next-Date.now())/1000));$('#dailyCountdown').textContent=`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor((seconds%3600)/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}

async function finishPuzzle(){
  if(state.completed||!state.engine||state.solutionUsed)return;
  state.completed=true;stopTimer();const timeMs=elapsed(),engineResult=state.engine.getResult?.(timeMs,state.hints)||{score:0,metadata:{}};
  const result={run_id:state.runId,game:game.key,difficulty:state.difficulty,mode:state.mode,score:Math.max(0,Math.min(5000,Math.round(engineResult.score||0))),time_ms:Math.round(timeMs),hints_used:state.hints,solution_used:false,metadata:{...(engineResult.metadata||{}),seed:state.seed}};
  openResult(result);await saveResult(result);
}

function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function rankingRow(row){const medal={1:'🥇',2:'🥈',3:'🥉'}[row.position]||`#${row.position}`,avatar=row.avatar_url?`<img src="${escapeHtml(row.avatar_url)}" alt="">`:'<span class="rank-avatar-fallback">S</span>';return `<div class="ranking-row${row.is_me?' is-me':''}"><span class="ranking-position">${medal}</span>${avatar}<span class="ranking-player"><b>${escapeHtml(row.display_name||'Player')}</b><small>${Number(row.games||0)} ranked games</small></span><strong>${Number(row.ranking_points||0).toLocaleString()} pts</strong></div>`;}
async function refreshRankings(){const host=$('#rankingList');if(!host)return;host.className='ranking-state';host.textContent='Loading rankings…';try{const data=await api(`/api/rankings?game=${encodeURIComponent(game.key)}&limit=10`),rows=data.rows||[];if(!rows.length){host.textContent='No ranked account finishes yet. Be the first.';return;}host.className='ranking-list';host.innerHTML=rows.map(rankingRow).join('');if(data.me&&!rows.some(r=>r.is_me))host.insertAdjacentHTML('beforeend',`<div class="ranking-gap">•••</div>${rankingRow(data.me)}`);}catch(error){host.textContent='Rankings are temporarily unavailable.';console.warn(error);}}
async function refreshProfile(){const body=$('#profileBody');if(!body)return;body.innerHTML='<div class="profile-loading">Loading profile…</div>';try{const data=await api(`/api/profile?game=${encodeURIComponent(game.key)}`);state.dailyCompleted=data.user?(data.daily_completed||[]):[];renderDaily();if(!data.user){body.innerHTML='<p class="profile-signed-out">Guest play is never ranked. Sign in before starting a puzzle to save verified scores, Daily progress and Ranking Points.</p><button class="button button-secondary profile-login" type="button">Sign in</button>';body.querySelector('.profile-login')?.addEventListener('click',()=>$('#loginButton')?.click());return;}body.innerHTML=`<div class="profile-stats"><div><b>${Number(data.games||0)}</b><small>GAMES</small></div><div><b>${Number(data.best||0).toLocaleString()}</b><small>BEST</small></div><div><b>${Number(data.ranking_points||0).toLocaleString()}</b><small>RANK PTS</small></div><div><b>${Number(data.streak||0)}</b><small>DAILY STREAK</small></div></div>`;}catch(error){body.innerHTML='<div class="profile-loading">Profile is temporarily unavailable.</div>';console.warn(error);}}
async function refreshRail(){await Promise.all([refreshRankings(),refreshProfile()]);}

function scrollBoardIntoView(){requestAnimationFrame(()=>$('.board-panel')?.scrollIntoView({behavior:'smooth',block:'start'}));}
function setupControls(){
  $$('.difficulty-button').forEach(b=>b.addEventListener('click',()=>setDifficulty(b.dataset.difficulty)));
  $$('.mode-button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('#newPuzzle')?.addEventListener('click',()=>startPuzzle());
  $('#resetPuzzle')?.addEventListener('click',()=>resetAttempt());
  $('#hint')?.addEventListener('click',()=>{if(state.completed||!state.engine||state.solutionVisible)return;const used=state.engine.hint?.();if(used!==false){state.hints++;setMetric('hints',state.hints);}});
  $('#solution')?.addEventListener('click',()=>{if(state.completed||!state.engine)return;if(state.solutionVisible){state.solutionVisible=false;state.engine.hideSolution?.();setPracticeUi(true,false);setStatus('Solution hidden. This attempt remains practice-only. Reset Puzzle to restore ranking eligibility.');return;}state.solutionUsed=true;state.solutionVisible=true;state.ranked=false;stopTimer();state.engine.solution?.();setPracticeUi(true,true);});
  $('#undoAction')?.addEventListener('click',()=>state.engine?.undo?.());
  $$('.daily-level').forEach(b=>b.addEventListener('click',async()=>{state.mode='daily';state.difficulty=b.dataset.difficulty;updateActiveControls();await startPuzzle();scrollBoardIntoView();}));
  $('#resultClose')?.addEventListener('click',()=>startPuzzle());$('#resultNew')?.addEventListener('click',()=>startPuzzle());$('#resultAgain')?.addEventListener('click',()=>startPuzzle({reuseSeed:true}));$('#resultNext')?.addEventListener('click',()=>{const next=nextDifficulty();if(next)setDifficulty(next);});
  document.addEventListener('keydown',e=>{const modal=$('#resultModal');if(!modal||modal.hidden)return;if(e.key==='Escape'){e.preventDefault();startPuzzle();return;}if(e.key==='Tab'){const items=resultFocusables();if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  window.addEventListener('snapoki:auth-changed',()=>{state.dailyCompleted=[];renderDaily();refreshRail();updateActiveControls();});
}
function applyQueryState(){const p=new URLSearchParams(location.search),difficulty=p.get('difficulty'),mode=p.get('mode');if(game.levels.some(([k])=>k===difficulty))state.difficulty=difficulty;if(mode==='daily')state.mode='daily';}
async function init(){applyQueryState();setupControls();updateActiveControls();renderDaily();updateCountdown();setInterval(updateCountdown,1000);await waitForAuth();refreshRail();await startPuzzle();}
init();
