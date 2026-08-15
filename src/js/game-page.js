import {getGame} from './games-config.js';
import {api, post, makeRunId, ApiError} from './api.js';
import {dailySeed, randomSeed, formatTime} from './games/utils.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const gameKey = document.body.dataset.game;
const game = getGame(gameKey);

if (!game) throw new Error(`Unknown Snapoki game: ${gameKey}`);

const state = {
  difficulty: game.levels[0][0],
  mode: 'normal',
  seed: '',
  runId: '',
  startedAt: 0,
  timer: null,
  engine: null,
  engineFactory: null,
  completed: false,
  hints: 0,
  solutionUsed: false,
  lastFocused: null
};

function metricElement(key) { return document.querySelector(`[data-metric-value="${key}"]`); }
function setMetric(key, value) {
  const element = metricElement(key);
  if (element) element.textContent = String(value);
}
function setMetrics(values = {}) {
  Object.entries(values).forEach(([key, value]) => setMetric(key, value));
}
function setStatus(text) {
  const element = $('#gameStatus');
  if (element) element.textContent = text;
}

function updateActiveControls() {
  $$('.difficulty-button').forEach(button => button.classList.toggle('active', button.dataset.difficulty === state.difficulty));
  $$('.mode-button').forEach(button => button.classList.toggle('active', button.dataset.mode === state.mode));
  const label = $('#boardModeLabel');
  if (label) label.textContent = state.mode === 'daily' ? `⭐ Daily · ${game.name}` : `Unlimited · ${game.name}`;
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function elapsed() { return state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0; }

function tick() {
  const ms = elapsed();
  setMetric('time', formatTime(ms));
  if (state.engine?.previewScore && metricElement('score')) {
    setMetric('score', Number(state.engine.previewScore(ms, state.hints)).toLocaleString());
  }
}

function beginTimer() {
  stopTimer();
  state.startedAt = Date.now();
  tick();
  state.timer = setInterval(tick, 250);
}

function getSeed(reuseSeed = false) {
  if (reuseSeed && state.seed) return state.seed;
  return state.mode === 'daily'
    ? dailySeed(game.key, state.difficulty)
    : randomSeed(game.key, state.difficulty);
}

async function loadEngineFactory() {
  if (state.engineFactory) return state.engineFactory;
  const module = await import(`/assets/js/games/${game.slug}.js`);
  if (typeof module.createGame !== 'function') throw new Error(`${game.name} engine is missing createGame().`);
  state.engineFactory = module.createGame;
  return state.engineFactory;
}

function resetMetricDefaults() {
  for (const [key] of game.metrics) setMetric(key, key === 'time' ? '00:00' : '0');
  setMetric('hints', '0');
  if (metricElement('score')) setMetric('score', '5,000');
}

async function startPuzzle({reuseSeed = false} = {}) {
  closeResult(false);
  state.engine?.destroy?.();
  state.engine = null;
  state.completed = false;
  state.hints = 0;
  state.solutionUsed = false;
  state.seed = getSeed(reuseSeed);
  state.runId = makeRunId(game.key);
  resetMetricDefaults();
  updateActiveControls();
  setStatus('Preparing puzzle…');
  $('#gameBoard')?.setAttribute('aria-busy', 'true');
  try {
    const createGame = await loadEngineFactory();
    state.engine = createGame({
      host: $('#gameBoard'),
      difficulty: state.difficulty,
      mode: state.mode,
      seed: state.seed,
      onMetrics: setMetrics,
      onStatus: setStatus,
      onComplete: finishPuzzle
    });
    const undo = $('#undoAction');
    if (undo) undo.hidden = !state.engine.supportsUndo;
    beginTimer();
  } catch (error) {
    console.error(error);
    setStatus('This puzzle could not start. Please refresh and try again.');
  } finally {
    $('#gameBoard')?.removeAttribute('aria-busy');
  }
}

function resetAttempt() {
  if (!state.engine) return;
  state.completed = false;
  state.hints = 0;
  state.solutionUsed = false;
  state.runId = makeRunId(game.key);
  state.engine.reset?.();
  setMetric('hints', '0');
  beginTimer();
}

function nextDifficulty() {
  const index = game.levels.findIndex(([key]) => key === state.difficulty);
  return game.levels[index + 1]?.[0] || null;
}

function setDifficulty(difficulty, start = true) {
  if (!game.levels.some(([key]) => key === difficulty)) return;
  state.difficulty = difficulty;
  updateActiveControls();
  if (start) startPuzzle();
}

function setMode(mode, start = true) {
  if (!['normal','daily'].includes(mode)) return;
  state.mode = mode;
  updateActiveControls();
  if (start) startPuzzle();
}

function difficultyLabel() {
  return game.levels.find(([key]) => key === state.difficulty)?.[1] || state.difficulty;
}

function modeLabel() { return state.mode === 'daily' ? 'Daily Challenge' : 'Unlimited'; }

function openResult(result) {
  const modal = $('#resultModal');
  if (!modal) return;
  state.lastFocused = document.activeElement;
  $('#resultGameName').textContent = `${game.name} Complete!`;
  $('#resultScore').textContent = Number(result.score || 0).toLocaleString();
  $('#resultDifficulty').textContent = `${difficultyLabel()} · ${modeLabel()}`;
  $('#resultTime').textContent = formatTime(result.time_ms);
  $('#resultHints').textContent = String(state.hints);
  $('#resultMode').textContent = state.mode === 'daily' ? 'Daily' : 'Unlimited';
  $('#resultRankPoints').textContent = state.solutionUsed ? 'Practice' : 'Saving…';
  const next = $('#resultNext');
  const nextKey = nextDifficulty();
  if (next) {
    next.hidden = !nextKey;
    if (nextKey) next.textContent = `Next: ${game.levels.find(([key]) => key === nextKey)[1]} →`;
  }
  const status = $('#resultSaveStatus');
  status.className = 'result-save-status';
  status.textContent = state.solutionUsed ? 'Practice run — solution viewed. This result is not ranked.' : 'Saving ranked result…';
  modal.hidden = false;
  document.body.classList.add('modal-open');
  $('#resultClose')?.focus();
}

function closeResult(restoreFocus = true) {
  const modal = $('#resultModal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  if (restoreFocus) state.lastFocused?.focus?.();
}

async function saveResult(result) {
  if (state.solutionUsed) return;
  const status = $('#resultSaveStatus');
  try {
    const saved = await post('/api/results', result);
    $('#resultRankPoints').textContent = `+${Number(saved.ranking_points || 0)} pts`;
    status.classList.add('success');
    status.textContent = saved.duplicate ? 'This ranked result was already saved.' : 'Ranked result saved.';
    await refreshRail();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      $('#resultRankPoints').textContent = 'Sign in';
      status.classList.add('muted');
      status.textContent = 'Sign in to save scores and join Rankings.';
    } else {
      $('#resultRankPoints').textContent = 'Not saved';
      status.classList.add('error');
      status.textContent = 'Online save is temporarily unavailable. Your game can continue.';
      console.warn('Result save failed', error);
    }
  }
}

function dailyStorage() {
  try { return JSON.parse(localStorage.getItem('snapoki_daily_v2') || '{}'); }
  catch { return {}; }
}
function todayKey() { return new Date().toISOString().slice(0,10); }
function completedDailyLevels() {
  const store = dailyStorage();
  return store[todayKey()]?.[game.key] || [];
}
function markDailyComplete() {
  const store = dailyStorage(), day = todayKey();
  store[day] ||= {};
  store[day][game.key] = [...new Set([...(store[day][game.key] || []), state.difficulty])];
  localStorage.setItem('snapoki_daily_v2', JSON.stringify(store));
  renderDaily();
}
function renderDaily() {
  const done = completedDailyLevels();
  $('#dailyProgress').textContent = `${done.length} of 3 completed`;
  $$('.daily-level').forEach(button => {
    const complete = done.includes(button.dataset.difficulty);
    button.classList.toggle('complete', complete);
    button.setAttribute('aria-label', `${button.textContent.trim()}${complete ? ', completed' : ''}`);
  });
}
function updateCountdown() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const seconds = Math.max(0, Math.floor((next - Date.now()) / 1000));
  const text = `${String(Math.floor(seconds / 3600)).padStart(2,'0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  $('#dailyCountdown').textContent = text;
}

async function finishPuzzle() {
  if (state.completed || !state.engine) return;
  state.completed = true;
  stopTimer();
  const timeMs = elapsed();
  const engineResult = state.engine.getResult?.(timeMs, state.hints) || {score: 0, metadata: {}};
  const result = {
    run_id: state.runId,
    game: game.key,
    difficulty: state.difficulty,
    mode: state.mode,
    score: Math.max(0, Math.min(5000, Math.round(engineResult.score || 0))),
    time_ms: Math.round(timeMs),
    hints_used: state.hints,
    solution_used: state.solutionUsed,
    metadata: {...(engineResult.metadata || {}), seed: state.seed}
  };
  if (state.mode === 'daily' && !state.solutionUsed) markDailyComplete();
  openResult(result);
  await saveResult(result);
}

function rankingRow(row) {
  const medal = {1:'🥇',2:'🥈',3:'🥉'}[row.position] || `#${row.position}`;
  const avatar = row.avatar_url ? `<img src="${escapeHtml(row.avatar_url)}" alt="">` : '<span class="rank-avatar-fallback">S</span>';
  return `<div class="ranking-row${row.is_me ? ' is-me' : ''}"><span class="ranking-position">${medal}</span>${avatar}<span class="ranking-player"><b>${escapeHtml(row.display_name || 'Player')}</b><small>${Number(row.games || 0)} ranked games</small></span><strong>${Number(row.ranking_points || 0).toLocaleString()} pts</strong></div>`;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

async function refreshRankings() {
  const host = $('#rankingList');
  if (!host) return;
  host.className = 'ranking-state';
  host.textContent = 'Loading rankings…';
  try {
    const data = await api(`/api/rankings?game=${encodeURIComponent(game.key)}&limit=10`);
    const rows = data.rows || [];
    if (!rows.length) {
      host.textContent = 'No ranked finishes yet. Be the first.';
      return;
    }
    host.className = 'ranking-list';
    host.innerHTML = rows.map(rankingRow).join('');
    if (data.me && !rows.some(row => row.is_me)) host.insertAdjacentHTML('beforeend', `<div class="ranking-gap">•••</div>${rankingRow(data.me)}`);
  } catch (error) {
    host.textContent = 'Rankings are temporarily unavailable.';
    console.warn(error);
  }
}

async function refreshProfile() {
  const body = $('#profileBody');
  if (!body) return;
  body.innerHTML = '<div class="profile-loading">Loading profile…</div>';
  try {
    const data = await api(`/api/profile?game=${encodeURIComponent(game.key)}`);
    if (!data.user) {
      body.innerHTML = '<p class="profile-signed-out">Sign in to save scores, build your streak, and join Rankings.</p><button class="button button-secondary profile-login" type="button">Sign in</button>';
      body.querySelector('.profile-login')?.addEventListener('click', () => $('#loginButton')?.click());
      return;
    }
    body.innerHTML = `<div class="profile-stats"><div><b>${Number(data.games || 0)}</b><small>GAMES</small></div><div><b>${Number(data.best || 0).toLocaleString()}</b><small>BEST</small></div><div><b>${Number(data.ranking_points || 0).toLocaleString()}</b><small>RANK PTS</small></div><div><b>${Number(data.streak || 0)}</b><small>STREAK</small></div></div>`;
  } catch (error) {
    body.innerHTML = '<div class="profile-loading">Profile is temporarily unavailable.</div>';
    console.warn(error);
  }
}

async function refreshRail() { await Promise.all([refreshRankings(), refreshProfile()]); }

function setupControls() {
  $$('.difficulty-button').forEach(button => button.addEventListener('click', () => setDifficulty(button.dataset.difficulty)));
  $$('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('#newPuzzle')?.addEventListener('click', () => startPuzzle());
  $('#resetPuzzle')?.addEventListener('click', resetAttempt);
  $('#hint')?.addEventListener('click', () => {
    if (state.completed || !state.engine) return;
    state.hints++;
    setMetric('hints', state.hints);
    state.engine.hint?.();
  });
  $('#solution')?.addEventListener('click', () => {
    if (state.completed || !state.engine) return;
    state.solutionUsed = true;
    state.engine.solution?.();
  });
  $('#undoAction')?.addEventListener('click', () => state.engine?.undo?.());
  $$('.daily-level').forEach(button => button.addEventListener('click', () => {
    state.mode = 'daily';
    state.difficulty = button.dataset.difficulty;
    updateActiveControls();
    startPuzzle();
    document.querySelector('.game-layout')?.scrollIntoView({behavior:'smooth', block:'start'});
  }));

  $('#resultClose')?.addEventListener('click', () => startPuzzle());
  $('#resultNew')?.addEventListener('click', () => startPuzzle());
  $('#resultAgain')?.addEventListener('click', () => startPuzzle({reuseSeed:true}));
  $('#resultNext')?.addEventListener('click', () => {
    const next = nextDifficulty();
    if (next) setDifficulty(next);
  });
  $('#resultModal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) startPuzzle();
  });
  document.addEventListener('keydown', event => {
    const modal = $('#resultModal');
    if (event.key === 'Escape' && modal && !modal.hidden) {
      event.preventDefault();
      startPuzzle();
    }
  });
  window.addEventListener('snapoki:auth-changed', refreshProfile);
}

function applyQueryState() {
  const params = new URLSearchParams(location.search);
  const difficulty = params.get('difficulty');
  const mode = params.get('mode');
  if (game.levels.some(([key]) => key === difficulty)) state.difficulty = difficulty;
  if (mode === 'daily') state.mode = 'daily';
}

async function init() {
  applyQueryState();
  setupControls();
  updateActiveControls();
  renderDaily();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  refreshRail();
  await startPuzzle();
}

init();
