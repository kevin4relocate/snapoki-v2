// Aquarium Loop: the first non-racing Ambient Engine experience.
import {createAmbientExperience} from '../ambient/engine.js';
import {createSwimmers} from '../ambient/swim.js';
import {AQUARIUM_THEME} from '../ambient/themes/aquarium.js';
export {AQUARIUM_THEME,AQUARIUM_CREATURES} from '../ambient/themes/aquarium.js';

export function generateAquariumLoop(difficulty='medium',seed='aquarium-loop'){
  const codes=new Set(AQUARIUM_THEME.defaultCodes);
  const creatures=AQUARIUM_THEME.items.filter(item=>codes.has(item.code));
  return {difficulty,seed,creatures,swimmers:createSwimmers(creatures,seed),endless:true};
}
export function createGame(options){return createAmbientExperience({...options,theme:AQUARIUM_THEME});}
