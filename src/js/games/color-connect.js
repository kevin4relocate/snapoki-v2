import {deterministicHamiltonianPath, areAdjacent, rngFromSeed, scoreFromPerformance} from './utils.js';

const LEVEL = {
  easy: {size: 5, colors: 4},
  medium: {size: 6, colors: 5},
  hard: {size: 7, colors: 6}
};
const COLORS = ['#ff5d8f','#52d273','#5ca8ff','#ffb347','#b879ff','#39d0d8','#ff7c54','#e7e25a'];

export function generateColorConnect(difficulty = 'easy', seed = 'color-connect') {
  const cfg = LEVEL[difficulty] || LEVEL.easy;
  const solution = deterministicHamiltonianPath(cfg.size, seed);
  const total = solution.length;
  const base = Math.floor(total / cfg.colors);
  const rng = rngFromSeed(`${seed}:segments`);
  const lengths = Array(cfg.colors).fill(base);
  let remaining = total - base * cfg.colors;
  while (remaining-- > 0) lengths[Math.floor(rng() * cfg.colors)]++;
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < cfg.colors; i++) {
    const path = solution.slice(cursor, cursor + lengths[i]);
    cursor += lengths[i];
    segments.push({color: COLORS[i], path, start: path[0], end: path.at(-1)});
  }
  return {size: cfg.size, segments, seed, difficulty};
}

export function createGame({host, difficulty, seed, onMetrics, onStatus, onComplete}) {
  const puzzle = generateColorConnect(difficulty, seed);
  const endpoint = new Map();
  puzzle.segments.forEach((segment, colorIndex) => {
    endpoint.set(segment.start, colorIndex);
    endpoint.set(segment.end, colorIndex);
  });
  let paths = new Map();
  let activeColor = null;
  let dragging = false;
  let redraws = 0;
  let hintedCells = new Set();

  host.innerHTML = `<div class="color-grid" style="--grid-size:${puzzle.size}" aria-label="Color Connect board"></div>`;
  const grid = host.querySelector('.color-grid');
  for (let index = 0; index < puzzle.size * puzzle.size; index++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'color-cell';
    cell.dataset.index = String(index);
    const colorIndex = endpoint.get(index);
    if (colorIndex != null) {
      cell.classList.add('color-endpoint');
      cell.style.setProperty('--cell-color', puzzle.segments[colorIndex].color);
      cell.setAttribute('aria-label', `Color endpoint ${colorIndex + 1}`);
    } else {
      cell.setAttribute('aria-label', 'Empty color path cell');
    }
    grid.appendChild(cell);
  }

  function ownerMap() {
    const owners = new Map();
    for (const [color, path] of paths) for (const idx of path) owners.set(idx, color);
    return owners;
  }

  function connectedCount() {
    let count = 0;
    puzzle.segments.forEach((segment, color) => {
      const path = paths.get(color) || [];
      if (path.length > 1 && ((path[0] === segment.start && path.at(-1) === segment.end) || (path[0] === segment.end && path.at(-1) === segment.start))) count++;
    });
    return count;
  }

  function render() {
    const owners = ownerMap();
    grid.querySelectorAll('.color-cell').forEach(cell => {
      const idx = Number(cell.dataset.index);
      const color = owners.get(idx);
      cell.classList.toggle('filled', color != null);
      cell.classList.toggle('hinted', hintedCells.has(idx));
      if (color != null) cell.style.setProperty('--path-color', puzzle.segments[color].color);
      else cell.style.removeProperty('--path-color');
    });
    onMetrics({paths: connectedCount(), redraws});
  }

  function beginColor(index) {
    const color = endpoint.get(index);
    if (color == null) return false;
    if (paths.has(color) && paths.get(color).length > 1) redraws++;
    paths.set(color, [index]);
    activeColor = color;
    render();
    return true;
  }

  function addCell(index) {
    if (activeColor == null) return beginColor(index);
    const path = paths.get(activeColor) || [];
    const last = path.at(-1);
    if (index === last) return true;
    if (!areAdjacent(last, index, puzzle.size)) return false;

    const ownIndex = path.indexOf(index);
    if (ownIndex >= 0) {
      if (ownIndex === path.length - 2) {
        path.pop();
        render();
        return true;
      }
      return false;
    }

    const endpointColor = endpoint.get(index);
    if (endpointColor != null && endpointColor !== activeColor) return false;
    const owners = ownerMap();
    const occupiedBy = owners.get(index);
    if (occupiedBy != null && occupiedBy !== activeColor) return false;

    path.push(index);
    paths.set(activeColor, path);
    const segment = puzzle.segments[activeColor];
    const atMatchingEnd = index === segment.start || index === segment.end;
    if (atMatchingEnd && path.length > 1) activeColor = null;
    render();
    checkComplete();
    return true;
  }

  function checkComplete() {
    const allConnected = connectedCount() === puzzle.segments.length;
    const covered = ownerMap().size === puzzle.size * puzzle.size;
    if (allConnected && covered) {
      onStatus('Color Connect complete.');
      onComplete();
    } else {
      onStatus(`${connectedCount()} of ${puzzle.segments.length} color pairs connected.`);
    }
  }

  grid.addEventListener('click', event => {
    const cell = event.target.closest('.color-cell');
    if (cell) addCell(Number(cell.dataset.index));
  });
  grid.addEventListener('pointerdown', event => {
    const cell = event.target.closest('.color-cell');
    if (!cell) return;
    dragging = true;
    beginColor(Number(cell.dataset.index));
  });
  grid.addEventListener('pointermove', event => {
    if (!dragging) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cell = element?.closest?.('.color-cell');
    if (cell && grid.contains(cell)) addCell(Number(cell.dataset.index));
  });
  const stop = () => { dragging = false; activeColor = null; };
  grid.addEventListener('pointerup', stop);
  grid.addEventListener('pointercancel', stop);

  onMetrics({paths: 0, redraws: 0, hints: 0});
  onStatus('Connect matching colors and cover every cell.');
  render();

  return {
    supportsUndo: false,
    reset() {
      paths = new Map();
      activeColor = null;
      redraws = 0;
      hintedCells = new Set();
      render();
      onStatus('Board reset. Connect every color pair.');
    },
    hint() {
      const target = puzzle.segments.find((segment, color) => {
        const path = paths.get(color) || [];
        return !(path.length > 1 && ((path[0] === segment.start && path.at(-1) === segment.end) || (path[0] === segment.end && path.at(-1) === segment.start)));
      });
      if (!target) return;
      hintedCells = new Set(target.path);
      render();
      onStatus('One correct color route is highlighted briefly.');
      setTimeout(() => { hintedCells = new Set(); render(); }, 2200);
    },
    solution() {
      paths = new Map(puzzle.segments.map((segment, color) => [color, [...segment.path]]));
      render();
      onStatus('Solution filled. This run is practice-only.');
      onComplete();
    },
    previewScore(timeMs, hints = 0) {
      return scoreFromPerformance({timeMs, actionPenalty: redraws * 80, hintPenalty: hints * 190});
    },
    getResult(timeMs, hints = 0) {
      return {
        score: scoreFromPerformance({timeMs, actionPenalty: redraws * 80, hintPenalty: hints * 190}),
        metadata: {redraws, paths: connectedCount(), size: puzzle.size}
      };
    },
    destroy() {}
  };
}
