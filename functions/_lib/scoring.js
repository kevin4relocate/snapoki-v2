const GAME_RULES = {
  maze: {
    size: {easy:11, medium:15, hard:19},
    timeDivisor: {easy:45, medium:80, hard:120},
    validate(meta, difficulty) {
      const size = int(meta.size), ideal = int(meta.ideal_moves), moves = int(meta.moves);
      if (size !== this.size[difficulty] || ideal < 1 || moves < ideal || moves > size * size * 6) return null;
      return {penalty: Math.max(0, moves - ideal) * 14, metadata: {size, ideal_moves:ideal, moves}};
    }
  },
  'number-path': {
    size: {easy:5, medium:6, hard:7},
    timeDivisor: {easy:50, medium:90, hard:140},
    validate(meta, difficulty) {
      const size = int(meta.size), cells = int(meta.cells), open = int(meta.open_cells), blocked = int(meta.blocked_cells), mistakes = int(meta.mistakes);
      const total = size * size;
      if (size !== this.size[difficulty] || open < 8 || open > total || cells !== open || blocked !== total - open || mistakes < 0 || mistakes > 500) return null;
      return {penalty: mistakes * 180, metadata: {size, cells, open_cells:open, blocked_cells:blocked, mistakes}};
    }
  },
  'color-connect': {
    size: {easy:5, medium:6, hard:7},
    pairs: {easy:4, medium:5, hard:7},
    timeDivisor: {easy:55, medium:95, hard:150},
    validate(meta, difficulty) {
      const size = int(meta.size), paths = int(meta.paths), open = int(meta.open_cells), blocked = int(meta.blocked_cells), redraws = int(meta.redraws);
      const total = size * size;
      if (size !== this.size[difficulty] || paths !== this.pairs[difficulty] || open < this.pairs[difficulty] * 3 || open > total || blocked !== total - open || redraws < 0 || redraws > 500) return null;
      return {penalty: redraws * 80, metadata: {size, paths, open_cells:open, blocked_cells:blocked, redraws}};
    }
  },
  'lights-out': {
    size: {easy:5, medium:6, hard:7},
    minimumRange: {easy:[3,5], medium:[7,9], hard:[11,14]},
    timeDivisor: {easy:50, medium:85, hard:125},
    validate(meta, difficulty) {
      const size = int(meta.size), moves = int(meta.moves), minimum = int(meta.minimum_moves), [min,max] = this.minimumRange[difficulty];
      if (size !== this.size[difficulty] || minimum < min || minimum > max || moves < minimum || moves > size * size * 8) return null;
      return {penalty: Math.max(0, moves - minimum) * 65, metadata: {size, moves, minimum_moves:minimum}};
    }
  },
  'loop-puzzle': {
    size: {easy:5, medium:7, hard:9},
    timeDivisor: {easy:65, medium:110, hard:170},
    validate(meta, difficulty) {
      const size = int(meta.size), edges = int(meta.edges), conflicts = int(meta.conflicts), clues = int(meta.clues);
      const maxEdges = 2 * size * (size + 1);
      if (size !== this.size[difficulty] || edges < 4 || edges > maxEdges || conflicts !== 0 || clues < 1 || clues > size * size) return null;
      return {penalty: 0, metadata: {size, edges, conflicts, clues}};
    }
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const int = value => Number.isFinite(Number(value)) ? Math.round(Number(value)) : -1;

export function expectedDailySeed(game, difficulty, date = new Date()) {
  return `${game}:${date.toISOString().slice(0,10)}:${difficulty}`;
}

export function verifySeed({game, difficulty, mode, seed}) {
  if (typeof seed !== 'string' || seed.length < 8 || seed.length > 220) return false;
  if (mode === 'daily') return seed === expectedDailySeed(game, difficulty);
  return seed.startsWith(`${game}:${difficulty}:`);
}

export function verifyAndScoreResult({game, difficulty, mode, time_ms, hints_used, metadata}) {
  const rule = GAME_RULES[game];
  if (!rule) return {ok:false, reason:'INVALID_GAME'};
  const timeMs = int(time_ms), hints = int(hints_used);
  if (timeMs < 1000 || timeMs > 1000 * 60 * 60 * 4) return {ok:false, reason:'IMPLAUSIBLE_TIME'};
  if (hints < 0 || hints > 99) return {ok:false, reason:'INVALID_HINTS'};
  if (!metadata || typeof metadata !== 'object') return {ok:false, reason:'INVALID_METADATA'};
  if (!verifySeed({game, difficulty, mode, seed:metadata.seed})) return {ok:false, reason:'INVALID_SEED'};
  const checked = rule.validate(metadata, difficulty);
  if (!checked) return {ok:false, reason:'IMPLAUSIBLE_RESULT'};
  const timePenalty = timeMs / rule.timeDivisor[difficulty];
  const hintPenalty = hints * 190;
  const score = clamp(Math.round(5000 - timePenalty - checked.penalty - hintPenalty), 250, 5000);
  return {ok:true, score, timeMs, hints, metadata:checked.metadata};
}
