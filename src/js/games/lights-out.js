import {rngFromSeed, scoreFromPerformance} from './utils.js';

const LEVEL = {easy: {size: 5, presses: 7}, medium: {size: 6, presses: 12}, hard: {size: 7, presses: 18}};

export function pressLights(board, size, index) {
  const out = Uint8Array.from(board);
  const row = Math.floor(index / size), col = index % size;
  const cells = [[row,col],[row-1,col],[row+1,col],[row,col-1],[row,col+1]];
  for (const [r,c] of cells) {
    if (r < 0 || c < 0 || r >= size || c >= size) continue;
    const i = r * size + c;
    out[i] ^= 1;
  }
  return out;
}

export function solveLightsOut(board, size) {
  const n = size * size;
  const rows = Array.from({length: n}, (_, equation) => {
    const row = new Uint8Array(n + 1);
    const er = Math.floor(equation / size), ec = equation % size;
    for (let press = 0; press < n; press++) {
      const pr = Math.floor(press / size), pc = press % size;
      if ((pr === er && pc === ec) || (Math.abs(pr-er) + Math.abs(pc-ec) === 1)) row[press] = 1;
    }
    row[n] = board[equation] ? 1 : 0;
    return row;
  });

  let pivotRow = 0;
  const pivotCols = [];
  for (let col = 0; col < n && pivotRow < n; col++) {
    let found = -1;
    for (let r = pivotRow; r < n; r++) if (rows[r][col]) { found = r; break; }
    if (found < 0) continue;
    [rows[pivotRow], rows[found]] = [rows[found], rows[pivotRow]];
    for (let r = 0; r < n; r++) {
      if (r === pivotRow || !rows[r][col]) continue;
      for (let c = col; c <= n; c++) rows[r][c] ^= rows[pivotRow][c];
    }
    pivotCols[pivotRow] = col;
    pivotRow++;
  }
  for (let r = pivotRow; r < n; r++) {
    let any = false;
    for (let c = 0; c < n; c++) any ||= Boolean(rows[r][c]);
    if (!any && rows[r][n]) return null;
  }
  const solution = new Uint8Array(n);
  for (let r = pivotRow - 1; r >= 0; r--) {
    const col = pivotCols[r];
    let value = rows[r][n];
    for (let c = col + 1; c < n; c++) if (rows[r][c] && solution[c]) value ^= 1;
    solution[col] = value;
  }
  return [...solution].map((v, i) => v ? i : -1).filter(i => i >= 0);
}

export function generateLightsOut(difficulty = 'easy', seed = 'lights-out') {
  const cfg = LEVEL[difficulty] || LEVEL.easy;
  const rng = rngFromSeed(seed);
  let board = new Uint8Array(cfg.size * cfg.size);
  const applied = [];
  for (let i = 0; i < cfg.presses; i++) {
    const index = Math.floor(rng() * board.length);
    board = pressLights(board, cfg.size, index);
    applied.push(index);
  }
  if (![...board].some(Boolean)) board = pressLights(board, cfg.size, Math.floor(board.length / 2));
  return {size: cfg.size, board: Array.from(board), seed, difficulty, solution: solveLightsOut(board, cfg.size) || []};
}

export function createGame({host, difficulty, seed, onMetrics, onStatus, onComplete}) {
  const puzzle = generateLightsOut(difficulty, seed);
  const initial = Uint8Array.from(puzzle.board);
  let board = Uint8Array.from(initial);
  let moves = 0;
  let hinted = null;

  host.innerHTML = `<div class="lights-grid" style="--grid-size:${puzzle.size}" aria-label="Lights Out board"></div>`;
  const grid = host.querySelector('.lights-grid');
  for (let index = 0; index < board.length; index++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'light-cell';
    cell.dataset.index = String(index);
    cell.setAttribute('aria-label', `Light ${index + 1}`);
    grid.appendChild(cell);
  }

  function litCount() { return [...board].filter(Boolean).length; }
  function render() {
    grid.querySelectorAll('.light-cell').forEach(cell => {
      const idx = Number(cell.dataset.index);
      cell.classList.toggle('on', Boolean(board[idx]));
      cell.classList.toggle('hinted', hinted === idx);
      cell.setAttribute('aria-pressed', String(Boolean(board[idx])));
    });
    onMetrics({moves, lit: litCount()});
  }
  function press(index, countMove = true) {
    board = pressLights(board, puzzle.size, index);
    if (countMove) moves++;
    render();
    if (litCount() === 0) {
      onStatus('All lights are off.');
      onComplete();
    } else {
      onStatus(`${litCount()} lights still on.`);
    }
  }

  grid.addEventListener('click', event => {
    const cell = event.target.closest('.light-cell');
    if (cell) press(Number(cell.dataset.index));
  });

  onMetrics({moves: 0, lit: litCount(), hints: 0});
  onStatus('Turn every light off. Each press toggles its neighbors too.');
  render();

  return {
    supportsUndo: false,
    reset() {
      board = Uint8Array.from(initial);
      moves = 0;
      hinted = null;
      render();
      onStatus('Board reset. Turn every light off.');
    },
    hint() {
      const solution = solveLightsOut(board, puzzle.size) || [];
      hinted = solution[0] ?? null;
      if (hinted == null) {
        onStatus('No hint needed — the board is solved.');
        return;
      }
      render();
      onStatus('A useful next press is highlighted.');
      setTimeout(() => { hinted = null; render(); }, 1800);
    },
    solution() {
      const solution = solveLightsOut(board, puzzle.size) || [];
      for (const index of solution) board = pressLights(board, puzzle.size, index);
      moves += solution.length;
      render();
      onStatus('Solution applied. This run is practice-only.');
      onComplete();
    },
    previewScore(timeMs, hints = 0) {
      const baseline = Math.max(1, puzzle.solution.length);
      return scoreFromPerformance({timeMs, actionPenalty: Math.max(0, moves - baseline) * 60, hintPenalty: hints * 190});
    },
    getResult(timeMs, hints = 0) {
      const baseline = Math.max(1, puzzle.solution.length);
      return {
        score: scoreFromPerformance({timeMs, actionPenalty: Math.max(0, moves - baseline) * 60, hintPenalty: hints * 190}),
        metadata: {moves, baseline_moves: baseline, size: puzzle.size}
      };
    },
    destroy() {}
  };
}
