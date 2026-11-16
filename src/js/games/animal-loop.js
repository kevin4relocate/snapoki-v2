// Animal Loop uses the exact same endless race physics, controls, audio and HUD.
import {createEndlessRace,buildEndlessRaceRoster} from '../endless-race/engine.js';
import {ANIMAL_THEME} from '../endless-race/themes/animal.js';
export {ANIMAL_LOOP_ANIMALS,ANIMAL_THEME,ANIMAL_LOOP_FACE_RIGHT_MASCOTS} from '../endless-race/themes/animal.js';

export function generateAnimalLoop(difficulty='medium',seed='animal-loop'){
  return {difficulty,seed,racers:buildEndlessRaceRoster(ANIMAL_THEME,ANIMAL_THEME.defaultCodes,seed,difficulty),endless:true};
}
export function createGame(options){return createEndlessRace({...options,theme:ANIMAL_THEME});}
