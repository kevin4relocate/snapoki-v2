// Data-only theme; Ambient Engine behavior is independent of the subject.
export const AQUARIUM_CREATURES=Object.freeze([
  Object.freeze({
    "code": "TF",
    "name": "Tropical Fish",
    "emoji": "🐠"
  }),
  Object.freeze({
    "code": "SF",
    "name": "Silver Fish",
    "emoji": "🐟"
  }),
  Object.freeze({
    "code": "PF",
    "name": "Pufferfish",
    "emoji": "🐡"
  }),
  Object.freeze({
    "code": "SH",
    "name": "Shark",
    "emoji": "🦈"
  }),
  Object.freeze({
    "code": "DO",
    "name": "Dolphin",
    "emoji": "🐬"
  }),
  Object.freeze({
    "code": "WH",
    "name": "Blue Whale",
    "emoji": "🐋"
  }),
  Object.freeze({
    "code": "TU",
    "name": "Sea Turtle",
    "emoji": "🐢"
  }),
  Object.freeze({
    "code": "OC",
    "name": "Octopus",
    "emoji": "🐙"
  }),
  Object.freeze({
    "code": "SQ",
    "name": "Squid",
    "emoji": "🦑"
  }),
  Object.freeze({
    "code": "JE",
    "name": "Jellyfish",
    "emoji": "🪼"
  }),
  Object.freeze({
    "code": "CR",
    "name": "Crab",
    "emoji": "🦀"
  }),
  Object.freeze({
    "code": "LO",
    "name": "Lobster",
    "emoji": "🦞"
  }),
  Object.freeze({
    "code": "SR",
    "name": "Shrimp",
    "emoji": "🦐"
  }),
  Object.freeze({
    "code": "SE",
    "name": "Seal",
    "emoji": "🦭"
  }),
  Object.freeze({
    "code": "OT",
    "name": "Otter",
    "emoji": "🦦"
  }),
  Object.freeze({
    "code": "PE",
    "name": "Penguin",
    "emoji": "🐧"
  })
]);
export const AQUARIUM_THEME=Object.freeze({
  id:'aquarium',
  title:'Aquarium Loop',
  singular:'sea creature',
  plural:'sea creatures',
  items:AQUARIUM_CREATURES,
  defaultCodes:Object.freeze(['TF','SF','PF','DO','TU','OC','JE','SE']),
  storageKey:'snapoki:aquarium-loop:roster:v1',
  modes:Object.freeze([['easy','Drift'],['medium','Flow'],['hard','Playful']])
});
