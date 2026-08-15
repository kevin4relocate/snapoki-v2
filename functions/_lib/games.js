import {GAMES as GAME_REGISTRY} from '../../src/js/games-config.js';

export const GAMES = new Set(GAME_REGISTRY.map(game=>game.key));
export const DIFFICULTIES = new Set(GAME_REGISTRY.flatMap(game=>game.levels.map(([key])=>key)));
export const MODES = new Set(['normal','daily']);

export function validGame(value) { return GAMES.has(value); }
export function validDifficulty(value) { return DIFFICULTIES.has(value); }
export function validMode(value) { return MODES.has(value); }

export function rankingPoints({difficulty, mode, score, hints = 0}) {
  const base = {easy:45, medium:70, hard:95}[difficulty] || 45;
  const performance = Math.min(80, Math.max(0, Math.floor(Number(score || 0) / 65)));
  const dailyBonus = mode === 'daily' ? 15 : 0;
  const hintPenalty = Math.min(base + performance, Math.max(0, Number(hints || 0)) * 12);
  return Math.max(5, base + performance + dailyBonus - hintPenalty);
}
