import {GAMES as GAME_REGISTRY,DIFFICULTY_REWARDS} from '../../src/js/games-config.js';
export const GAMES = new Set(GAME_REGISTRY.map(game=>game.key));
export const DIFFICULTIES = new Set(GAME_REGISTRY.flatMap(game=>game.levels.map(([key])=>key)));
export const MODES = new Set(['normal','daily']);
export function validGame(value){return GAMES.has(value);}
export function validDifficulty(value){return DIFFICULTIES.has(value);}
export function validMode(value){return MODES.has(value);}
export function difficultyMultiplier(difficulty){return DIFFICULTY_REWARDS[difficulty]||1;}
export function rankingPoints({difficulty,mode,score,hints=0}){
  const factor=difficultyMultiplier(difficulty),numericScore=Math.max(250,Math.min(5000,Number(score)||250)),base=Math.round(300+numericScore*.14),hintCount=Math.max(0,Number(hints)||0),hintPenalty=hintCount*90+Math.max(0,hintCount-1)*45,quality=Math.max(100,base-hintPenalty);
  return Math.round(quality*factor);
}
