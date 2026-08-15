import {deterministicHamiltonianPath, areAdjacent, scoreFromPerformance} from './utils.js';

const LEVEL_SIZE = {easy: 5, medium: 6, hard: 7};
const CLUE_GAP = {easy: 4, medium: 7, hard: 10};

export function generateNumberPath(difficulty = 'easy', seed = 'number-path') {
  const size = LEVEL_SIZE[difficulty] || LEVEL_SIZE.easy;
  const solution = deterministicHamiltonianPath(size, seed);
  const gap = CLUE_GAP[difficulty] || 4;
  const cluePositions = [0];
  for (let i = gap; i < solution.length - 1; i += gap) cluePositions.push(i);
  if (cluePositions.at(-1) !== solution.length - 1) cluePositions.push(solution.length - 1);
  const clues = cluePositions.map((position, i) => ({index: solution[position], label: i + 1, position}));
  return {size, solution, clues, seed, difficulty};
}

export function createGame({host, difficulty, seed, onMetrics, onStatus, onComplete}) {
  const puzzle = generateNumberPath(difficulty, seed);
  const clueMap = new Map(puzzle.clues.map(clue => [clue.index, clue.label]));
  let path = [puzzle.solution[0]];
  let mistakes = 0;
  let dragging = false;
  let hintIndex = null;

  host.innerHTML = `<div class="number-grid" style="--grid-size:${puzzle.size}" aria-label="Number Path board"></div>`;
  const grid = host.querySelector('.number-grid');
  for (let index = 0; index < puzzle.size * puzzle.size; index++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-cell';
    button.dataset.index = String(index);
    const clue = clueMap.get(index);
    if (clue) {
      button.classList.add('checkpoint');
      button.innerHTML = `<span>${clue}</span>`;
      button.setAttribute('aria-label', `Checkpoint ${clue}`);
    } else {
      button.setAttribute('aria-label', 'Empty path cell');
    }
    grid.appendChild(button);
  }

  function nextExpectedLabel() {
    let highest = 1;
    for (const index of path) {
      const label = clueMap.get(index);
      if (label && label === highest + 1) highest = label;
    }
    return highest + 1;
  }

  function render() {
    const pathSet = new Set(path);
    grid.querySelectorAll('.number-cell').forEach(cell => {
      const idx = Number(cell.dataset.index);
      cell.classList.toggle('in-path', pathSet.has(idx));
      cell.classList.toggle('path-head', path.at(-1) === idx);
      cell.classList.toggle('hinted', hintIndex === idx);
      const order = path.indexOf(idx);
      cell.style.setProperty('--path-order', String(order < 0 ? 0 : order));
    });
    onMetrics({cells: path.length, mistakes});
  }

  function addCell(index) {
    const last = path.at(-1);
    if (index === last) return true;
    if (!areAdjacent(last, index, puzzle.size)) return false;
    const existing = path.indexOf(index);
    if (existing >= 0) {
      if (existing === path.length - 2) {
        path.pop();
        render();
        return true;
      }
      return false;
    }
    const clue = clueMap.get(index);
    const expected = nextExpectedLabel();
    if (clue && clue !== expected) {
      mistakes++;
      onMetrics({mistakes});
      onStatus(`Checkpoint ${clue} is too early. Find checkpoint ${expected} first.`);
      return false;
    }
    path.push(index);
    render();
    if (path.length === puzzle.size * puzzle.size) {
      const finalLabel = puzzle.clues.at(-1).label;
      if (clueMap.get(index) === finalLabel) {
        onStatus('Number Path complete.');
        onComplete();
      } else {
        mistakes++;
        onMetrics({mistakes});
        onStatus('Every cell is filled, but the final checkpoint must be last.');
      }
    } else {
      onStatus(`Filled ${path.length} of ${puzzle.size * puzzle.size} cells.`);
    }
    return true;
  }

  grid.addEventListener('click', event => {
    const cell = event.target.closest('.number-cell');
    if (cell) addCell(Number(cell.dataset.index));
  });

  grid.addEventListener('pointerdown', event => {
    const cell = event.target.closest('.number-cell');
    if (!cell) return;
    dragging = true;
    grid.setPointerCapture?.(event.pointerId);
    addCell(Number(cell.dataset.index));
  });
  grid.addEventListener('pointermove', event => {
    if (!dragging) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cell = element?.closest?.('.number-cell');
    if (cell && grid.contains(cell)) addCell(Number(cell.dataset.index));
  });
  const endDrag = () => { dragging = false; };
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointercancel', endDrag);

  onMetrics({cells: 1, mistakes: 0, hints: 0});
  onStatus('Start at 1. Fill every cell and visit checkpoints in order.');
  render();

  return {
    supportsUndo: true,
    undo() {
      if (path.length <= 1) return;
      path.pop();
      render();
      onStatus('Last cell removed.');
    },
    reset() {
      path = [puzzle.solution[0]];
      mistakes = 0;
      hintIndex = null;
      render();
      onStatus('Path reset. Start again from 1.');
    },
    hint() {
      const prefixMatches = path.every((index, i) => puzzle.solution[i] === index);
      if (prefixMatches && path.length < puzzle.solution.length) {
        hintIndex = puzzle.solution[path.length];
        onStatus('The next safe cell is highlighted.');
      } else {
        const current = path.at(-1);
        const pos = puzzle.solution.indexOf(current);
        hintIndex = pos >= 0 ? puzzle.solution[pos + 1] ?? null : null;
        onStatus(hintIndex == null ? 'Undo or reset a few cells to use the guided hint.' : 'A solution cell near your current position is highlighted.');
      }
      render();
      setTimeout(() => { hintIndex = null; render(); }, 2200);
    },
    solution() {
      path = [...puzzle.solution];
      render();
      onStatus('Solution filled. This run is practice-only.');
      onComplete();
    },
    previewScore(timeMs, hints = 0) {
      return scoreFromPerformance({timeMs, mistakePenalty: mistakes * 180, hintPenalty: hints * 190});
    },
    getResult(timeMs, hints = 0) {
      return {
        score: scoreFromPerformance({timeMs, mistakePenalty: mistakes * 180, hintPenalty: hints * 190}),
        metadata: {cells: path.length, mistakes, size: puzzle.size}
      };
    },
    destroy() {}
  };
}
