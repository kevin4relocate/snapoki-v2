import {rngFromSeed, shuffle, orthogonalNeighbors, rcOf, indexOf, scoreFromPerformance} from './utils.js';

const N = 1, E = 2, S = 4, W = 8;
const OPPOSITE = {[N]: S, [E]: W, [S]: N, [W]: E};
const LEVEL_SIZE = {easy: 11, medium: 15, hard: 19};

function directionBetween(a, b, cols) {
  const [ar, ac] = rcOf(a, cols), [br, bc] = rcOf(b, cols);
  if (br === ar - 1) return N;
  if (bc === ac + 1) return E;
  if (br === ar + 1) return S;
  if (bc === ac - 1) return W;
  return 0;
}

export function generateMaze(difficulty = 'easy', seed = 'maze') {
  const size = LEVEL_SIZE[difficulty] || LEVEL_SIZE.easy;
  const total = size * size;
  const walls = new Uint8Array(total).fill(N | E | S | W);
  const visited = new Uint8Array(total);
  const rng = rngFromSeed(seed);
  const stack = [0];
  visited[0] = 1;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const candidates = orthogonalNeighbors(current, size, size).filter(n => !visited[n]);
    if (!candidates.length) {
      stack.pop();
      continue;
    }
    const next = shuffle(candidates, rng)[0];
    const dir = directionBetween(current, next, size);
    walls[current] &= ~dir;
    walls[next] &= ~OPPOSITE[dir];
    visited[next] = 1;
    stack.push(next);
  }
  return {size, walls: Array.from(walls), start: 0, end: total - 1, seed, difficulty};
}

export function solveMaze(maze, from = maze.start, to = maze.end) {
  const {size, walls} = maze;
  const queue = [from];
  const previous = new Int32Array(size * size).fill(-1);
  previous[from] = from;
  for (let qi = 0; qi < queue.length; qi++) {
    const current = queue[qi];
    if (current === to) break;
    const [row, col] = rcOf(current, size);
    const options = [];
    if (!(walls[current] & N) && row > 0) options.push(indexOf(row - 1, col, size));
    if (!(walls[current] & E) && col < size - 1) options.push(indexOf(row, col + 1, size));
    if (!(walls[current] & S) && row < size - 1) options.push(indexOf(row + 1, col, size));
    if (!(walls[current] & W) && col > 0) options.push(indexOf(row, col - 1, size));
    for (const next of options) {
      if (previous[next] !== -1) continue;
      previous[next] = current;
      queue.push(next);
    }
  }
  if (previous[to] === -1) return [];
  const path = [];
  let cursor = to;
  while (cursor !== from) {
    path.push(cursor);
    cursor = previous[cursor];
  }
  path.push(from);
  return path.reverse();
}

export function createGame({host, difficulty, seed, onMetrics, onStatus, onComplete}) {
  let maze = generateMaze(difficulty, seed);
  let solution = solveMaze(maze);
  let player = maze.start;
  let moves = 0;
  let shownSolution = false;
  let hintCell = null;
  let destroyed = false;
  let canvas, ctx, dpad;

  host.innerHTML = '<div class="maze-stage"><canvas class="maze-canvas" aria-label="Maze board"></canvas><div class="maze-dpad" aria-label="Maze controls"><span></span><button data-dir="up" aria-label="Move up">↑</button><span></span><button data-dir="left" aria-label="Move left">←</button><button data-dir="down" aria-label="Move down">↓</button><button data-dir="right" aria-label="Move right">→</button></div></div>';
  canvas = host.querySelector('canvas');
  ctx = canvas.getContext('2d');
  dpad = host.querySelector('.maze-dpad');

  function draw() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const display = Math.max(280, Math.floor(rect.width || host.clientWidth || 560));
    canvas.width = display * ratio;
    canvas.height = display * ratio;
    canvas.style.height = `${display}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, display, display);
    const cell = display / maze.size;
    ctx.fillStyle = '#0d1222';
    ctx.fillRect(0, 0, display, display);

    if (shownSolution) {
      ctx.strokeStyle = 'rgba(40,201,245,.55)';
      ctx.lineWidth = Math.max(3, cell * .18);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      solution.forEach((idx, i) => {
        const [r, c] = rcOf(idx, maze.size);
        const x = (c + .5) * cell, y = (r + .5) * cell;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    if (hintCell != null) {
      const [r, c] = rcOf(hintCell, maze.size);
      ctx.fillStyle = 'rgba(55,217,154,.28)';
      ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
    }

    ctx.strokeStyle = '#66708a';
    ctx.lineWidth = Math.max(1.4, cell * .07);
    ctx.beginPath();
    maze.walls.forEach((mask, idx) => {
      const [r, c] = rcOf(idx, maze.size);
      const x = c * cell, y = r * cell;
      if (mask & N) {ctx.moveTo(x, y); ctx.lineTo(x + cell, y);}
      if (mask & W) {ctx.moveTo(x, y); ctx.lineTo(x, y + cell);}
      if (r === maze.size - 1 && mask & S) {ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell);}
      if (c === maze.size - 1 && mask & E) {ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell);}
    });
    ctx.stroke();

    const drawMarker = (idx, color, radiusScale) => {
      const [r, c] = rcOf(idx, maze.size);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc((c + .5) * cell, (r + .5) * cell, Math.max(4, cell * radiusScale), 0, Math.PI * 2);
      ctx.fill();
    };
    drawMarker(maze.end, '#37d99a', .23);
    drawMarker(player, '#7357ff', .27);
  }

  function canMove(to) {
    const dir = directionBetween(player, to, maze.size);
    return dir && !(maze.walls[player] & dir);
  }

  function moveTo(next) {
    if (!canMove(next)) return false;
    player = next;
    moves++;
    onMetrics({moves});
    onStatus(player === maze.end ? 'Maze complete.' : 'Keep going. Find the green finish.');
    draw();
    if (player === maze.end) onComplete();
    return true;
  }

  function moveDirection(dirName) {
    const [r, c] = rcOf(player, maze.size);
    const target = dirName === 'up' && r > 0 ? indexOf(r - 1, c, maze.size)
      : dirName === 'right' && c < maze.size - 1 ? indexOf(r, c + 1, maze.size)
      : dirName === 'down' && r < maze.size - 1 ? indexOf(r + 1, c, maze.size)
      : dirName === 'left' && c > 0 ? indexOf(r, c - 1, maze.size) : -1;
    if (target >= 0) moveTo(target);
  }

  const keyHandler = event => {
    const map = {ArrowUp:'up', ArrowRight:'right', ArrowDown:'down', ArrowLeft:'left', w:'up', d:'right', s:'down', a:'left'};
    const dir = map[event.key];
    if (!dir) return;
    event.preventDefault();
    moveDirection(dir);
  };
  window.addEventListener('keydown', keyHandler);
  dpad.addEventListener('click', event => {
    const button = event.target.closest('button[data-dir]');
    if (button) moveDirection(button.dataset.dir);
  });

  let touchStart = null;
  canvas.addEventListener('pointerdown', event => { touchStart = [event.clientX, event.clientY]; });
  canvas.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart[0], dy = event.clientY - touchStart[1];
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    moveDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  window.addEventListener('resize', draw);

  onMetrics({moves: 0, hints: 0, score: 5000});
  onStatus('Reach the green finish. Use arrows, swipe, or the D-pad.');
  requestAnimationFrame(draw);

  return {
    supportsUndo: false,
    reset() {
      player = maze.start;
      moves = 0;
      hintCell = null;
      shownSolution = false;
      onMetrics({moves: 0});
      onStatus('Puzzle reset. Reach the green finish.');
      draw();
    },
    hint() {
      const path = solveMaze(maze, player, maze.end);
      hintCell = path[1] ?? null;
      draw();
      setTimeout(() => { hintCell = null; draw(); }, 1800);
      onStatus(hintCell == null ? 'You are already at the finish.' : 'A safe next cell is highlighted.');
    },
    solution() {
      solution = solveMaze(maze, player, maze.end);
      shownSolution = true;
      onStatus('Solution shown. This run is practice-only.');
      draw();
    },
    previewScore(timeMs, hints = 0) {
      const ideal = Math.max(1, solution.length - 1);
      const extraMoves = Math.max(0, moves - ideal);
      return scoreFromPerformance({timeMs, actionPenalty: extraMoves * 14, hintPenalty: hints * 180});
    },
    getResult(timeMs, hints = 0) {
      const ideal = Math.max(1, solveMaze(maze).length - 1);
      return {
        score: scoreFromPerformance({timeMs, actionPenalty: Math.max(0, moves - ideal) * 14, hintPenalty: hints * 180}),
        metadata: {moves, ideal_moves: ideal, size: maze.size}
      };
    },
    destroy() {
      destroyed = true;
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('resize', draw);
    }
  };
}
