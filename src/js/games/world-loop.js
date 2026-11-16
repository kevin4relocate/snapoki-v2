// Backwards-compatible Flag entry point. The same engine powers Animal Loop.
// Keep /world-loop/ and exported helpers stable for existing links and tests.
import {createEndlessRace} from '../endless-race/engine.js';
import {FLAG_THEME} from '../endless-race/themes/flag.js';
export {WORLD_LOOP_COUNTRIES,WORLD_LOOP_PICKER_COUNTRIES,WORLD_LOOP_MASCOTS,
  WORLD_LOOP_FACE_RIGHT_MASCOTS,WORLD_LOOP_ALREADY_RIGHT_OR_NEUTRAL_MASCOTS,
  sortWorldLoopCodes,restoreWorldLoopSelection,FLAG_THEME} from '../endless-race/themes/flag.js';
export {WORLD_LOOP_AUDIO_SRC,WORLD_LOOP_CROSSFADE_SECONDS,buildWorldLoopRoster,
  worldLoopOrder,worldLoopGap,formatWorldLoopDistance,generateWorldLoop} from '../endless-race/engine.js';

export function createGame(options){return createEndlessRace({...options,theme:FLAG_THEME});}
