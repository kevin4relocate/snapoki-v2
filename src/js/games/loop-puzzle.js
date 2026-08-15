import {rngFromSeed, scoreFromPerformance} from './utils.js';

const LEVEL = {easy: {size: 5, clueRate: .82}, medium: {size: 7, clueRate: .62}, hard: {size: 9, clueRate: .46}};

const hKey = (r,c) => `h:${r}:${c}`;
const vKey = (r,c) => `v:${r}:${c}`;

function blobRegion(size, seed) {
  const rng = rngFromSeed(seed);
  const center = (size - 1) / 2;
  const cells = new Set();
  let prevLeft = Math.max(1, Math.floor(center) - 1);
  let prevRight = Math.min(size - 2, Math.ceil(center) + 1);
  for (let r = 1; r < size - 1; r++) {
    const distance = Math.abs(r - center);
    const widthBoost = Math.max(0, Math.floor((size / 2 - distance) / 2));
    let left = prevLeft + (rng() < .35 ? -1 : rng() > .75 ? 1 : 0);
    let right = prevRight + (rng() < .35 ? 1 : rng() > .75 ? -1 : 0);
    left = Math.max(0, Math.min(Math.floor(center) - 1, left - widthBoost));
    right = Math.min(size - 1, Math.max(Math.ceil(center) + 1, right + widthBoost));
    if (left > prevRight) left = prevRight;
    if (right < prevLeft) right = prevLeft;
    for (let c = left; c <= right; c++) cells.add(`${r}:${c}`);
    prevLeft = left;
    prevRight = right;
  }
  return cells;
}

export function generateLoopPuzzle(difficulty = 'easy', seed = 'loop-puzzle') {
  const cfg = LEVEL[difficulty] || LEVEL.easy;
  const region = blobRegion(cfg.size, seed);
  const solution = new Set();
  for (let r = 0; r < cfg.size; r++) for (let c = 0; c < cfg.size; c++) {
    if (!region.has(`${r}:${c}`)) continue;
    if (r === 0 || !region.has(`${r-1}:${c}`)) solution.add(hKey(r,c));
    if (r === cfg.size - 1 || !region.has(`${r+1}:${c}`)) solution.add(hKey(r+1,c));
    if (c === 0 || !region.has(`${r}:${c-1}`)) solution.add(vKey(r,c));
    if (c === cfg.size - 1 || !region.has(`${r}:${c+1}`)) solution.add(vKey(r,c+1));
  }
  const rng = rngFromSeed(`${seed}:clues`);
  const clues = [];
  for (let r = 0; r < cfg.size; r++) for (let c = 0; c < cfg.size; c++) {
    const edges = [hKey(r,c), hKey(r+1,c), vKey(r,c), vKey(r,c+1)];
    const value = edges.filter(edge => solution.has(edge)).length;
    if (rng() <= cfg.clueRate) clues.push({r,c,value});
  }
  return {size: cfg.size, solution: [...solution], clues, seed, difficulty};
}

export function isSingleLoop(edges, size) {
  if (!edges.length) return false;
  const adjacency = new Map();
  const add = (a,b) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push(b); adjacency.get(b).push(a);
  };
  for (const edge of edges) {
    const [type, rs, cs] = edge.split(':'), r = Number(rs), c = Number(cs);
    if (type === 'h') add(`${r}:${c}`, `${r}:${c+1}`);
    else add(`${r}:${c}`, `${r+1}:${c}`);
  }
  if ([...adjacency.values()].some(list => list.length !== 2)) return false;
  const start = adjacency.keys().next().value;
  const seen = new Set([start]), queue = [start];
  while (queue.length) {
    const node = queue.shift();
    for (const next of adjacency.get(node) || []) if (!seen.has(next)) {seen.add(next); queue.push(next);}
  }
  return seen.size === adjacency.size;
}

export function createGame({host, difficulty, seed, onMetrics, onStatus, onComplete}) {
  const puzzle = generateLoopPuzzle(difficulty, seed);
  const solution = new Set(puzzle.solution);
  let active = new Set();
  let mistakes = 0;
  let hinted = null;
  const size = puzzle.size;
  const vb = 100;
  const step = vb / size;

  host.innerHTML = `<div class="loop-wrap"><svg class="loop-svg" viewBox="-2 -2 104 104" role="img" aria-label="Loop Puzzle board"></svg></div>`;
  const svg = host.querySelector('svg');
  const ns = 'http://www.w3.org/2000/svg';

  for (let r = 0; r <= size; r++) for (let c = 0; c < size; c++) {
    const y = r * step, x1 = c * step, x2 = (c + 1) * step, key = hKey(r,c);
    const base = document.createElementNS(ns, 'line');
    base.setAttribute('x1', x1); base.setAttribute('x2', x2); base.setAttribute('y1', y); base.setAttribute('y2', y); base.setAttribute('class','loop-base');
    svg.appendChild(base);
    const hit = document.createElementNS(ns, 'line');
    hit.setAttribute('x1', x1); hit.setAttribute('x2', x2); hit.setAttribute('y1', y); hit.setAttribute('y2', y); hit.setAttribute('class','loop-hit'); hit.dataset.edge = key;
    svg.appendChild(hit);
  }
  for (let r = 0; r < size; r++) for (let c = 0; c <= size; c++) {
    const x = c * step, y1 = r * step, y2 = (r + 1) * step, key = vKey(r,c);
    const base = document.createElementNS(ns, 'line');
    base.setAttribute('x1', x); base.setAttribute('x2', x); base.setAttribute('y1', y1); base.setAttribute('y2', y2); base.setAttribute('class','loop-base');
    svg.appendChild(base);
    const hit = document.createElementNS(ns, 'line');
    hit.setAttribute('x1', x); hit.setAttribute('x2', x); hit.setAttribute('y1', y1); hit.setAttribute('y2', y2); hit.setAttribute('class','loop-hit'); hit.dataset.edge = key;
    svg.appendChild(hit);
  }
  for (const clue of puzzle.clues) {
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', (clue.c + .5) * step); text.setAttribute('y', (clue.r + .58) * step); text.setAttribute('class','loop-clue'); text.textContent = String(clue.value);
    svg.appendChild(text);
  }
  for (let r = 0; r <= size; r++) for (let c = 0; c <= size; c++) {
    const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('cx', c*step); dot.setAttribute('cy', r*step); dot.setAttribute('r', .75); dot.setAttribute('class','loop-dot'); svg.appendChild(dot);
  }

  function render() {
    svg.querySelectorAll('.loop-hit').forEach(line => {
      const edge = line.dataset.edge;
      line.classList.toggle('active', active.has(edge));
      line.classList.toggle('hinted', hinted === edge);
    });
    onMetrics({edges: active.size, mistakes});
  }
  function checkComplete() {
    if (active.size !== solution.size) return false;
    for (const edge of active) if (!solution.has(edge)) return false;
    if (!isSingleLoop([...active], size)) return false;
    onStatus('Loop complete.');
    onComplete();
    return true;
  }
  svg.addEventListener('click', event => {
    const line = event.target.closest?.('.loop-hit');
    if (!line) return;
    const edge = line.dataset.edge;
    if (active.has(edge)) active.delete(edge);
    else {
      active.add(edge);
      if (!solution.has(edge)) mistakes++;
    }
    render();
    if (!checkComplete()) onStatus(`${active.size} edges drawn. Use the clues to complete one loop.`);
  });

  onMetrics({edges: 0, mistakes: 0, hints: 0});
  onStatus('Draw one closed loop that satisfies the number clues.');
  render();

  return {
    supportsUndo: false,
    reset() {
      active = new Set(); mistakes = 0; hinted = null; render();
      onStatus('Board reset. Draw one closed loop.');
    },
    hint() {
      hinted = [...solution].find(edge => !active.has(edge)) || null;
      if (hinted) {
        active.add(hinted);
        render();
        onStatus('One correct edge has been added.');
        setTimeout(() => { hinted = null; render(); }, 1500);
        checkComplete();
      } else onStatus('All solution edges are already present.');
    },
    solution() {
      active = new Set(solution); render();
      onStatus('Solution filled. This run is practice-only.');
      onComplete();
    },
    previewScore(timeMs, hints = 0) {
      return scoreFromPerformance({timeMs, mistakePenalty: mistakes * 130, hintPenalty: hints * 190});
    },
    getResult(timeMs, hints = 0) {
      return {score: scoreFromPerformance({timeMs, mistakePenalty: mistakes * 130, hintPenalty: hints * 190}), metadata: {edges: active.size, mistakes, solution_edges: solution.size, size}};
    },
    destroy() {}
  };
}
