import {GAMES as GAME_REGISTRY,DIFFICULTY_REWARDS} from '../../src/js/games-config.js';

export const GAMES = new Set(GAME_REGISTRY.map(game=>game.key));
export const DIFFICULTIES = new Set(GAME_REGISTRY.flatMap(game=>game.levels.map(([key])=>key)));
export const MODES = new Set(['normal','daily']);
const GAME_MAP=new Map(GAME_REGISTRY.map(game=>[game.key,game]));

export function gameConfig(value){return GAME_MAP.get(value)||null;}
export function validGame(value){return GAMES.has(value);}
export function validDifficulty(value){return DIFFICULTIES.has(value);}
export function validMode(value){return MODES.has(value);}
export function validGameDifficulty(game,difficulty){const config=gameConfig(game);return Boolean(config?.levels?.some(([key])=>key===difficulty));}
export function gameAllowsRanking(game){const config=gameConfig(game);return Boolean(config&&config.capabilities?.ranking!==false&&config.ranking?.enabled!==false);}
export function gameAllowsDaily(game){const config=gameConfig(game);return Boolean(config&&config.capabilities?.daily!==false);}
export function validGameMode(game,mode){if(mode==='normal')return gameAllowsRanking(game);if(mode==='daily')return gameAllowsRanking(game)&&gameAllowsDaily(game);return false;}
export function difficultyMultiplier(difficulty){return DIFFICULTY_REWARDS[difficulty]||1;}
export function rankingPoints({difficulty,mode,score,hints=0}){
  const factor=difficultyMultiplier(difficulty),numericScore=Math.max(250,Math.min(5000,Number(score)||250)),base=Math.round(300+numericScore*.14),hintCount=Math.max(0,Number(hints)||0),hintPenalty=hintCount*90+Math.max(0,hintCount-1)*45,quality=Math.max(100,base-hintPenalty);
  return Math.round(quality*factor);
}
