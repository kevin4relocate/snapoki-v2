import {getGame,DIFFICULTY_REWARDS} from './games-config.js';
import {getGamePresentation} from './game-presentation.js';
import {renderGameStatus} from './game-status.js';
import {dailySeed,randomSeed,formatTime} from './games/utils.js';
import {resolveColorConnectReview,COLOR_CONNECT_REVIEW_SAMPLES,COLOR_CONNECT_REVIEW_BANDS,colorConnectReviewUrl} from './games/color-connect-review.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const makeRunId=key=>`local-${key}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const gameKey=document.body.dataset.game,game=getGame(gameKey);
if(!game)throw new Error(`Unknown Snapoki game: ${gameKey}`);
const presentation=getGamePresentation(game);
const queryParams=new URLSearchParams(location.search);
const review=gameKey==='color-connect'?resolveColorConnectReview(queryParams):null;
const state={
  difficulty:game.levels[0][0],
  mode:'normal',
  seed:'',
  runId:'',
  ranked:false,
  unrankedReason:'',
  startedAt:0,
  timer:null,
  engine:null,
  engineFactory:null,
  engineLocked:false,
  loading:false,
  completed:false,
  practiceComplete:false,
  hints:0,
  solutionUsed:false,
  solutionVisible:false,
  lastFocused:null,
  dailyCompleted:[],
  dailyStreak:0,
  smartNext:null,
  startToken:0,
  };

const capability=name=>game.capabilities?.[name]!==false;

function metricElement(k){return document.querySelector(`[data-metric-value="${k}"]`);}
function setMetric(k,v){const e=metricElement(k);if(e)e.textContent=String(v);}
function setMetrics(v={}){Object.entries(v).forEach(([k,x])=>setMetric(k,x));updateControlAvailability();}
function setStatus(t){renderGameStatus($('#gameStatus'),gameKey,t);}
function modeName(){return state.mode==='daily'?'Daily Challenge':'Regular Play';}
function runLabel(){
  if(review)return`Review · ${review.score}`;
  if(state.solutionUsed)return state.practiceComplete?'Practice Complete':'Practice';
  if(state.ranked)return modeName();
  if(state.unrankedReason==='recent_replay')return'Replay';
  if(state.unrankedReason==='daily_solution_viewed')return'Daily Practice';
  return modeName();
}
function setDisabled(selector,value){const element=$(selector);if(element)element.disabled=Boolean(value);}
function updateControlAvailability(){
  const ready=Boolean(state.engine)&&!state.loading,done=state.completed,locked=Boolean(state.engineLocked),reviewLocked=Boolean(review);
  setDisabled('#newPuzzle',state.loading);
  setDisabled('#hint',!capability('hint')||!ready||done||locked||state.solutionVisible);
  setDisabled('#solution',!capability('solution')||!ready||done||locked);
  setDisabled('#resetPuzzle',!ready||(done&&!state.practiceComplete));
  $$('.difficulty-button,.mode-button,.daily-level').forEach(button=>button.disabled=state.loading||reviewLocked);
  $$('[data-review-band],[data-review-seed]').forEach(button=>button.disabled=state.loading);
}
function updateActiveControls(){
  $$('.difficulty-button').forEach(b=>b.classList.toggle('active',b.dataset.difficulty===state.difficulty));
  $$('.mode-button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  const label=$('#boardModeLabel');if(label)label.textContent=runLabel();
  updateControlAvailability();
}

function decorateRewards(){
  for(const button of $$('.difficulty-button')){
    if(button.querySelector('.difficulty-reward'))continue;
    const mult=DIFFICULTY_REWARDS[button.dataset.difficulty]||1,reward=document.createElement('em');
    reward.className='difficulty-reward';
    reward.textContent=`×${mult} SCORE`;
    button.appendChild(reward);
  }
  for(const button of $$('.daily-level')){
    if(button.querySelector('.daily-reward'))continue;
    const reward=document.createElement('em');
    reward.className='daily-reward';
    reward.textContent='STREAK';
    button.appendChild(reward);
  }
}
function applyCapabilities(){
  const hint=$('#hint'),solution=$('#solution'),dailyMode=$('.mode-button[data-mode="daily"]'),dailySection=$('.daily-section'),normalMode=$('.mode-button[data-mode="normal"]');
  if(hint)hint.hidden=!capability('hint');
  if(solution)solution.hidden=!capability('solution');
  if(dailyMode)dailyMode.hidden=!capability('daily')||Boolean(review);
  if(dailySection)dailySection.hidden=!capability('daily')||Boolean(review);
  if(review&&normalMode)normalMode.textContent='Calibration Review';
}

function stopTimer(){if(state.timer)clearInterval(state.timer);state.timer=null;}
function elapsed(){return state.startedAt?Math.max(0,Date.now()-state.startedAt):0;}
function tick(){
  if(state.engineLocked||state.completed)return;
  const ms=elapsed();
  setMetric('time',formatTime(ms));
  if(state.engine?.previewScore&&metricElement('score'))setMetric('score',Number(state.engine.previewScore(ms,state.hints)).toLocaleString());
}
function beginTimer(){stopTimer();state.startedAt=Date.now();tick();state.timer=setInterval(tick,250);}
function guestSeed(reuseSeed=false,previousSeed=''){
  if(review)return review.seed;
  if(reuseSeed&&previousSeed)return previousSeed;
  return state.mode==='daily'?dailySeed(game.key,state.difficulty):randomSeed(game.key,state.difficulty);
}
async function waitForAuth(){return {user:null,ready:true};}
async function rankedAttempt(){return null;}
async function loadEngineFactory(){
  if(state.engineFactory)return state.engineFactory;
  const module=await import(`/assets/js/games/${game.slug}.js`);
  if(typeof module.createGame!=='function')throw new Error(`${game.name} engine is missing createGame().`);
  state.engineFactory=module.createGame;
  return state.engineFactory;
}
function resetMetricDefaults(){
  for(const[key]of game.metrics)setMetric(key,key==='time'?'00:00':'0');
  setMetric('hints','0');
  if(metricElement('score'))setMetric('score','5,000');
}

function ensurePracticeNotice(){
  let notice=$('#practiceCompleteNotice');if(notice)return notice;
  notice=document.createElement('div');
  notice.id='practiceCompleteNotice';notice.className='practice-complete-notice';notice.hidden=true;
  notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  notice.innerHTML='<span class="practice-complete-icon">✓</span><div><strong>Practice Complete</strong><small>You completed the guided puzzle.</small></div>';
  $('.board-panel')?.appendChild(notice);
  return notice;
}
function hidePracticeNotice(){const notice=$('#practiceCompleteNotice');if(notice)notice.hidden=true;$('.board-panel')?.classList.remove('practice-complete');}
function showPracticeNotice(message){
  const notice=ensurePracticeNotice(),text=notice?.querySelector('small');
  if(text)text.textContent=message||'Guided run complete. Reset to practice again or start a New Puzzle.';
  if(notice)notice.hidden=false;
  $('.board-panel')?.classList.add('practice-complete');
}
function ensureSolutionNavigator(){
  let nav=$('#solutionNavigator');if(nav)return nav;
  nav=document.createElement('div');nav.id='solutionNavigator';nav.className='solution-navigator';nav.hidden=true;
  nav.innerHTML='<button type="button" data-solution-nav="prev" aria-label="Previous solution step">←</button><span><b>Step</b><small id="solutionProgress">—</small></span><button type="button" data-solution-nav="next" aria-label="Next solution step">→</button>';
  nav.addEventListener('click',e=>{
    const button=e.target.closest('[data-solution-nav]');
    if(!button||!state.solutionVisible)return;
    renderSolutionProgress(state.engine?.solutionStep?.(button.dataset.solutionNav==='prev'?-1:1));
  });
  $('.board-toolbar')?.insertAdjacentElement('afterend',nav);
  return nav;
}
function renderSolutionProgress(info){
  if(!capability('solutionSteps'))return;
  const nav=ensureSolutionNavigator();
  if(!info){nav.hidden=true;return;}
  nav.hidden=false;
  const text=$('#solutionProgress',nav);if(text)text.textContent=`${info.current} / ${info.total}${info.label?` · ${info.label}`:''}`;
  const prev=$('[data-solution-nav="prev"]',nav),next=$('[data-solution-nav="next"]',nav);
  if(prev)prev.disabled=Number(info.current)<=1;
  if(next)next.disabled=Number(info.current)>=Number(info.total);
}
function hideSolutionNavigator(){const nav=$('#solutionNavigator');if(nav)nav.hidden=true;}
function setPracticeUi(used=state.solutionUsed,visible=state.solutionVisible){
  $('.board-panel')?.classList.toggle('practice-mode',used);
  const b=$('#solution'),label=presentation.solutionLabel||'Solution';
  if(b){b.textContent=visible?(label==='Solution'?'Hide Solution':`Exit ${label}`):label;b.setAttribute('aria-pressed',String(visible));}
  if(!visible)hideSolutionNavigator();
  updateActiveControls();
}

function ensureReviewPanel(){
  if(!review)return;
  document.body.classList.add('calibration-review-mode');
  if(!$('#colorReviewStyle')){
    const style=document.createElement('style');style.id='colorReviewStyle';
    style.textContent='.color-review-panel{margin:12px 0 6px;padding:14px;border:1px solid rgba(124,139,255,.3);border-radius:14px;background:rgba(124,139,255,.07)}.color-review-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.color-review-head b{display:block;font-size:14px}.color-review-head small{display:block;margin-top:3px;opacity:.72}.color-review-exit{font-size:12px;text-decoration:none;white-space:nowrap}.color-review-bands,.color-review-samples{display:flex;gap:7px;flex-wrap:wrap}.color-review-bands{margin-bottom:8px}.color-review-panel button{border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.045);color:inherit;border-radius:999px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer}.color-review-panel button.active{border-color:rgba(124,139,255,.75);background:rgba(124,139,255,.18)}.color-review-metrics{margin-top:10px;font-size:12px;line-height:1.55;opacity:.82}.calibration-review-mode .daily-section{display:none!important}@media(max-width:640px){.color-review-head{display:block}.color-review-exit{display:inline-block;margin-top:7px}.color-review-panel button{padding:7px 9px}}';
    document.head.appendChild(style);
  }
  let panel=$('#colorReviewPanel');if(panel)return panel;
  panel=document.createElement('div');panel.id='colorReviewPanel';panel.className='color-review-panel';panel.setAttribute('aria-label','Color Connect calibration review');
  const bandButtons=COLOR_CONNECT_REVIEW_BANDS.map(band=>`<button type="button" data-review-band="${band}" class="${band===review.band?'active':''}">${band}</button>`).join('');
  const samples=COLOR_CONNECT_REVIEW_SAMPLES.filter(sample=>sample.band===review.band);
  const sampleButtons=samples.map((sample,index)=>`<button type="button" data-review-seed="${sample.seed}" class="${sample.seed===review.seed?'active':''}">Sample ${index+1} · ${sample.score}</button>`).join('');
  panel.innerHTML=`<div class="color-review-head"><div><b>Calibration Review · Score ${review.score}</b><small>Practice-only. No Daily progress is saved.</small></div><a class="color-review-exit" href="/color-connect/">Exit Review</a></div><div class="color-review-bands">${bandButtons}</div><div class="color-review-samples">${sampleButtons}</div><div class="color-review-metrics">${review.backtracks} backtracks · ${review.deadEnds} dead ends · ${review.decisions} decisions · ${review.greedyTraps} greedy traps · ${review.temptingRoutes} tempting routes · ${review.shortcutVictims} shortcut victims</div>`;
  panel.addEventListener('click',event=>{
    const seedButton=event.target.closest('[data-review-seed]'),bandButton=event.target.closest('[data-review-band]');
    if(seedButton){const sample=COLOR_CONNECT_REVIEW_SAMPLES.find(item=>item.seed===seedButton.dataset.reviewSeed);if(sample)location.href=colorConnectReviewUrl(sample);return;}
    if(bandButton){const sample=COLOR_CONNECT_REVIEW_SAMPLES.find(item=>item.band===bandButton.dataset.reviewBand);if(sample)location.href=colorConnectReviewUrl(sample);}
  });
  $('.board-toolbar')?.insertAdjacentElement('afterend',panel);
  const newButton=$('#newPuzzle'),resetButton=$('#resetPuzzle');
  if(newButton)newButton.textContent='Restart Sample';
  if(resetButton)resetButton.textContent='Reset Sample';
  return panel;
}

async function startPuzzle({reuseSeed=false}={}){
  const token=++state.startToken,previousSeed=state.seed,previousRunId=state.runId;
  closeResult(false);hidePracticeNotice();hideSolutionNavigator();
  state.engine?.destroy?.();state.engine=null;state.engineLocked=false;state.loading=true;state.completed=false;state.practiceComplete=false;state.hints=0;state.solutionUsed=false;state.solutionVisible=false;state.ranked=false;state.unrankedReason=review?'review_mode':'';state.smartNext=null;
  stopTimer();setPracticeUi(false,false);resetMetricDefaults();setStatus(review?`Loading calibration sample ${review.score}…`:'Preparing puzzle…');
  $('#gameBoard')?.setAttribute('aria-busy','true');updateActiveControls();
  try{
    const enginePromise=loadEngineFactory(),attemptPromise=rankedAttempt(reuseSeed?previousRunId:'');
    const[createGame,attempt]=await Promise.all([enginePromise,attemptPromise]);
    if(token!==state.startToken)return;
    if(attempt?.seed&&!review){
      state.seed=attempt.seed;state.runId=attempt.run_id||makeRunId(game.key);state.ranked=Boolean(attempt.run_id&&attempt.ranked!==false);state.unrankedReason=attempt.reason||'';
    }else{
      state.seed=guestSeed(reuseSeed,previousSeed);state.runId=makeRunId(game.key);state.ranked=false;
      if(review)state.unrankedReason='review_mode';
    }
    state.engine=createGame({host:$('#gameBoard'),difficulty:state.difficulty,mode:state.mode,seed:state.seed,onMetrics:setMetrics,onStatus:setStatus,onComplete:finishPuzzle,onPracticeComplete:message=>finishPractice(review?`Review sample ${review.score} complete. Reset this sample or choose another calibration board.`:message)});
    state.loading=false;updateActiveControls();beginTimer();
    if(review)setStatus(`Review ${review.band} · score ${review.score} · practice-only.`);
    else if(state.unrankedReason==='recent_replay')setStatus('Replay mode: enjoy the same board again, or start a New Puzzle for a fresh challenge.');
    else if(state.unrankedReason==='daily_solution_viewed')setStatus('Daily Practice: Solution was viewed for this level today, so it cannot count toward today’s streak.');
  }catch(error){
    if(token!==state.startToken)return;
    console.error(error);state.loading=false;setStatus('This puzzle could not start. Please try New Puzzle.');updateActiveControls();
  }finally{if(token===state.startToken)$('#gameBoard')?.removeAttribute('aria-busy');}
}

async function resetAttempt(){
  if(!state.engine||state.loading)return;
  if(review){
    ++state.startToken;state.loading=true;state.completed=false;state.practiceComplete=false;state.hints=0;state.solutionUsed=false;state.solutionVisible=false;state.ranked=false;state.unrankedReason='review_mode';state.smartNext=null;
    stopTimer();hidePracticeNotice();hideSolutionNavigator();state.engine.reset?.();setMetric('hints','0');state.loading=false;setPracticeUi(false,false);beginTimer();setStatus(`Review ${review.band} · score ${review.score} · reset from the beginning.`);return;
  }
  const token=++state.startToken,previousRunId=state.runId,practiceLocked=state.solutionUsed;
  state.loading=true;state.completed=false;state.practiceComplete=false;state.hints=0;state.solutionVisible=false;state.smartNext=null;stopTimer();hidePracticeNotice();hideSolutionNavigator();
  if(!practiceLocked){
    state.solutionUsed=false;state.ranked=false;state.unrankedReason='';setPracticeUi(false,false);updateActiveControls();
    state.runId=makeRunId(game.key);
  }else{
    state.ranked=false;state.unrankedReason='solution_viewed';setPracticeUi(true,false);updateActiveControls();
  }
  state.engine.reset?.();setMetric('hints','0');state.loading=false;setPracticeUi(practiceLocked,false);beginTimer();
  setStatus(practiceLocked?'Practice reset. This same board remains practice-only after viewing Solution; New Puzzle starts a fresh board.':'Puzzle reset. Have another go.');
}
function setDifficulty(d,start=true){if(review||state.loading||!game.levels.some(([k])=>k===d))return;state.difficulty=d;updateActiveControls();if(start)startPuzzle();}
function setMode(m,start=true){if(review||state.loading||!['normal','daily'].includes(m)||m==='daily'&&!capability('daily'))return;state.mode=m;updateActiveControls();if(start)startPuzzle();}
function difficultyLabel(key=state.difficulty){return game.levels.find(([k])=>k===key)?.[1]||key;}

function resultFocusables(){const modal=$('#resultModal');return modal?$$('button,[href],[tabindex]:not([tabindex="-1"])',modal).filter(el=>!el.hidden&&!el.disabled):[];}
function ensureResultInsights(){
  let host=$('#resultInsights');if(host)return host;
  host=document.createElement('div');host.id='resultInsights';host.className='result-insights';host.hidden=true;$('#resultSaveStatus')?.insertAdjacentElement('beforebegin',host);return host;
}
function clearResultInsights(){const host=ensureResultInsights();host.hidden=true;host.innerHTML='';}
function renderResultInsights(){}
function setSmartNext(action){
  state.smartNext=action||null;
  const next=$('#resultNext');if(!next)return;
  next.hidden=!action;if(!action)return;
  next.textContent=action.label?`${action.label} →`:'Next Challenge →';
}
function openResult(result){
  const modal=$('#resultModal');if(!modal)return;
  clearResultInsights();setSmartNext(null);state.lastFocused=document.activeElement;
  $('#resultGameName').textContent=`${game.name} Complete!`;
  $('#resultScore').textContent=Number(result.score||0).toLocaleString();
  $('#resultDifficulty').textContent=state.mode==='normal'?`${difficultyLabel()} · Regular Play · ×${DIFFICULTY_REWARDS[state.difficulty]||1}`:`${difficultyLabel()} · Daily Challenge`;
  $('#resultTime').textContent=formatTime(result.time_ms);
  $('#resultHints').textContent=String(state.hints);
  $('#resultMode').textContent=modeName();
  const replay=state.unrankedReason==='recent_replay'||state.unrankedReason==='daily_solution_viewed';
  $('#resultRankPoints').textContent=state.mode==='daily'?'Saved':'Local';
  const status=$('#resultSaveStatus');status.className='result-save-status';
  status.textContent=state.mode==='daily'?`Daily ${difficultyLabel()} complete on this browser.`:'Nice solve. Start a new puzzle whenever you are ready.';
  modal.hidden=false;document.body.classList.add('modal-open');$('#resultClose')?.focus();
}
function closeResult(restore=true){const modal=$('#resultModal');if(!modal||modal.hidden)return;modal.hidden=true;document.body.classList.remove('modal-open');if(restore)state.lastFocused?.focus?.();}

async function saveResult(){return;}

const dailyStorageKey=()=>`snapoki:daily:v1:${game.key}`;
const utcDate=(date=new Date())=>date.toISOString().slice(0,10);
function shiftUtcDate(dateText,days){
  const date=new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate()+days);
  return utcDate(date);
}
function readDailyStore(){
  try{
    const parsed=JSON.parse(localStorage.getItem(dailyStorageKey())||'null');
    return parsed&&typeof parsed==='object'?parsed:{};
  }catch{return {};}
}
function writeDailyStore(data){
  try{localStorage.setItem(dailyStorageKey(),JSON.stringify(data));}catch{}
}
function loadLocalDailyProgress(){
  const today=utcDate(),data=readDailyStore(),valid=new Set(game.levels.map(([key])=>key));
  state.dailyCompleted=data.date===today&&Array.isArray(data.completed)?data.completed.filter(key=>valid.has(key)):[];
  const last=typeof data.last_complete==='string'?data.last_complete:'';
  state.dailyStreak=(last===today||last===shiftUtcDate(today,-1))?Math.max(0,Number(data.streak||0)):0;
}
function markLocalDailyComplete(){
  if(state.mode!=='daily')return;
  const today=utcDate(),yesterday=shiftUtcDate(today,-1),data=readDailyStore();
  const completed=data.date===today&&Array.isArray(data.completed)?[...new Set(data.completed)]:[];
  if(!completed.includes(state.difficulty))completed.push(state.difficulty);
  let streak=Math.max(0,Number(data.streak||0)),longest=Math.max(0,Number(data.longest||0)),last=typeof data.last_complete==='string'?data.last_complete:'';
  if(completed.length===game.levels.length&&last!==today){
    streak=last===yesterday?streak+1:1;
    longest=Math.max(longest,streak);
    last=today;
  }else if(last!==today&&last!==yesterday){
    streak=0;
  }
  const next={date:today,completed,streak,longest,last_complete:last};
  writeDailyStore(next);
  state.dailyCompleted=completed;
  state.dailyStreak=streak;
  renderDaily();
}

function renderDaily(){
  const done=state.dailyCompleted,progress=$('#dailyProgress'),wrap=$('.daily-progress'),remaining=Math.max(0,3-done.length);
  if(progress){
    if(done.length===3)progress.textContent=`✓ Daily Complete${state.dailyStreak?` · 🔥 ${state.dailyStreak}-day streak`:''}`;
    else progress.textContent=`${done.length}/3 complete · ${remaining} ${remaining===1?'level':'levels'} left${state.dailyStreak?` · 🔥 ${state.dailyStreak}-day streak`:''}`;
  }
  wrap?.classList.toggle('is-complete',done.length===3);
  $$('.daily-level').forEach(b=>{
    const complete=done.includes(b.dataset.difficulty);b.classList.toggle('complete',complete);
    const mark=b.querySelector('i');if(mark)mark.textContent=complete?'✓ DONE':'✓';
  });
}
function updateCountdown(){
  const now=new Date(),next=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1),seconds=Math.max(0,Math.floor((next-Date.now())/1000));
  $('#dailyCountdown').textContent=`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor((seconds%3600)/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function finishPractice(message){
  if(state.completed||!state.engine)return;
  state.completed=true;state.practiceComplete=true;stopTimer();hideSolutionNavigator();setStatus(message||'Practice complete.');showPracticeNotice(message||'Guided run complete. Reset to practice again or start a New Puzzle.');updateActiveControls();
}
async function finishPuzzle(){
  if(state.completed||!state.engine)return;
  if(review){finishPractice(`Review sample ${review.score} complete. Reset this sample or choose another calibration board.`);return;}
  if(state.solutionUsed){finishPractice('Practice complete. Start a New Puzzle for a fresh board.');return;}
  state.completed=true;state.practiceComplete=false;stopTimer();hideSolutionNavigator();updateActiveControls();
  const timeMs=elapsed(),engineResult=state.engine.getResult?.(timeMs,state.hints)||{score:0,metadata:{}};
  const result={run_id:state.runId,game:game.key,difficulty:state.difficulty,mode:state.mode,score:Math.max(0,Math.min(5000,Math.round(engineResult.score||0))),time_ms:Math.round(timeMs),hints_used:state.hints,solution_used:false,metadata:{...(engineResult.metadata||{}),seed:state.seed}};
  if(state.mode==='daily')markLocalDailyComplete();
  openResult(result);await saveResult(result);
}

function scrollBoardIntoView(){requestAnimationFrame(()=>$('.board-panel')?.scrollIntoView({behavior:'smooth',block:'start'}));}
async function runSmartNext(){
  const action=state.smartNext;closeResult(false);
  if(action){
    if(action.mode==='daily'&&capability('daily'))state.mode='daily';else if(action.mode==='normal')state.mode='normal';
    if(game.levels.some(([key])=>key===action.difficulty))state.difficulty=action.difficulty;
    updateActiveControls();
  }
  await startPuzzle();scrollBoardIntoView();
}
function setupControls(){
  $$('.difficulty-button').forEach(b=>b.addEventListener('click',()=>setDifficulty(b.dataset.difficulty)));
  $$('.mode-button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('#newPuzzle')?.addEventListener('click',()=>review?resetAttempt():startPuzzle());
  $('#resetPuzzle')?.addEventListener('click',()=>resetAttempt());
  $('#hint')?.addEventListener('click',()=>{
    if(state.loading||state.completed||state.engineLocked||!state.engine||state.solutionVisible||!capability('hint'))return;
    const used=state.engine.hint?.();if(used!==false){state.hints++;setMetric('hints',state.hints);}
  });
  $('#solution')?.addEventListener('click',()=>{
    if(state.loading||state.completed||state.engineLocked||!state.engine||!capability('solution'))return;
    if(state.solutionVisible){
      state.solutionVisible=false;state.engine.hideSolution?.();setPracticeUi(true,false);setStatus(review?'Solution hidden. Calibration Review remains practice-only.':'Solution hidden. This same board remains practice-only; New Puzzle starts a fresh board.');return;
    }
    state.solutionUsed=true;state.solutionVisible=true;state.ranked=false;state.unrankedReason=review?'review_mode':'solution_viewed';stopTimer();state.engine.solution?.();setPracticeUi(true,true);
    if(capability('solutionSteps'))renderSolutionProgress(state.engine.solutionStep?.(0)||null);
  });
  $$('.daily-level').forEach(b=>b.addEventListener('click',async()=>{
    if(review||state.loading||!capability('daily'))return;
    state.mode='daily';state.difficulty=b.dataset.difficulty;updateActiveControls();await startPuzzle();scrollBoardIntoView();
  }));
  $('#resultClose')?.addEventListener('click',()=>startPuzzle());
  $('#resultNew')?.addEventListener('click',()=>startPuzzle());
  $('#resultAgain')?.addEventListener('click',()=>startPuzzle({reuseSeed:true}));
  $('#resultNext')?.addEventListener('click',runSmartNext);
  document.addEventListener('keydown',e=>{
    const modal=$('#resultModal');if(!modal||modal.hidden)return;
    if(e.key==='Escape'){e.preventDefault();startPuzzle();return;}
    if(e.key==='Tab'){
      const items=resultFocusables();if(!items.length)return;
      const first=items[0],last=items.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
}
function applyQueryState(){
  if(review){state.difficulty='hard';state.mode='normal';return;}
  const difficulty=queryParams.get('difficulty'),mode=queryParams.get('mode');
  if(game.levels.some(([k])=>k===difficulty))state.difficulty=difficulty;
  if(mode==='daily'&&capability('daily'))state.mode='daily';
}
window.addEventListener('snapoki:game-lock',event=>{
  if(event.detail?.game!==game.key)return;
  state.engineLocked=Boolean(event.detail?.locked);
  if(state.engineLocked)stopTimer();
  updateControlAvailability();
});

async function init(){
  decorateRewards();applyCapabilities();applyQueryState();ensureReviewPanel();setupControls();loadLocalDailyProgress();updateActiveControls();renderDaily();updateCountdown();setInterval(updateCountdown,1000);
  await startPuzzle();
}
init();
