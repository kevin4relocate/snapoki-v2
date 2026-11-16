// Animal Loop: a distinct, extensible theme using the common race runtime.
// The icon is the racer itself; no flags or random vehicle stickers are shown.
export const ANIMAL_LOOP_ANIMALS=Object.freeze([
  {
    "code": "RB",
    "name": "Rabbit",
    "emoji": "🐇",
    "flag": "🐇"
  },
  {
    "code": "TL",
    "name": "Turtle",
    "emoji": "🐢",
    "flag": "🐢"
  },
  {
    "code": "FX",
    "name": "Fox",
    "emoji": "🦊",
    "flag": "🦊"
  },
  {
    "code": "PD",
    "name": "Panda",
    "emoji": "🐼",
    "flag": "🐼"
  },
  {
    "code": "LN",
    "name": "Lion",
    "emoji": "🦁",
    "flag": "🦁"
  },
  {
    "code": "TG",
    "name": "Tiger",
    "emoji": "🐅",
    "flag": "🐅"
  },
  {
    "code": "BR",
    "name": "Bear",
    "emoji": "🐻",
    "flag": "🐻"
  },
  {
    "code": "CT",
    "name": "Cat",
    "emoji": "🐈",
    "flag": "🐈"
  },
  {
    "code": "DG",
    "name": "Dog",
    "emoji": "🐕",
    "flag": "🐕"
  },
  {
    "code": "WF",
    "name": "Wolf",
    "emoji": "🐺",
    "flag": "🐺"
  },
  {
    "code": "DP",
    "name": "Dolphin",
    "emoji": "🐬",
    "flag": "🐬"
  },
  {
    "code": "DN",
    "name": "Dinosaur",
    "emoji": "🦖",
    "flag": "🦖"
  },
  {
    "code": "PG",
    "name": "Penguin",
    "emoji": "🐧",
    "flag": "🐧"
  },
  {
    "code": "KL",
    "name": "Koala",
    "emoji": "🐨",
    "flag": "🐨"
  },
  {
    "code": "FR",
    "name": "Frog",
    "emoji": "🐸",
    "flag": "🐸"
  },
  {
    "code": "OW",
    "name": "Owl",
    "emoji": "🦉",
    "flag": "🦉"
  },
  {
    "code": "EG",
    "name": "Eagle",
    "emoji": "🦅",
    "flag": "🦅"
  },
  {
    "code": "BE",
    "name": "Bee",
    "emoji": "🐝",
    "flag": "🐝"
  },
  {
    "code": "DR",
    "name": "Deer",
    "emoji": "🦌",
    "flag": "🦌"
  },
  {
    "code": "HS",
    "name": "Horse",
    "emoji": "🐎",
    "flag": "🐎"
  },
  {
    "code": "PI",
    "name": "Pig",
    "emoji": "🐖",
    "flag": "🐖"
  },
  {
    "code": "EL",
    "name": "Elephant",
    "emoji": "🐘",
    "flag": "🐘"
  },
  {
    "code": "MK",
    "name": "Monkey",
    "emoji": "🐒",
    "flag": "🐒"
  },
  {
    "code": "UN",
    "name": "Unicorn",
    "emoji": "🦄",
    "flag": "🦄"
  }
]);
const DEFAULT_ANIMAL_CODES=Object.freeze(['RB','TL','FX','PD','LN','TG','DP','DN']);
export const ANIMAL_LOOP_FACE_RIGHT_MASCOTS=new Set(['🐇','🐢','🦊','🐅','🐈','🐕','🐺','🐬','🦖','🦅','🐝','🦌','🐎','🐘','🐒','🦄']);
export const ANIMAL_THEME=Object.freeze({
  id:'animal',
  name:'Animal Loop',
  singular:'animal',
  plural:'animals',
  searchLabel:'animal or code',
  storageKey:'snapoki:animal-loop:roster:v1',
  defaultCodes:DEFAULT_ANIMAL_CODES,
  items:ANIMAL_LOOP_ANIMALS,
  picker:[...ANIMAL_LOOP_ANIMALS].sort((a,b)=>a.name.localeCompare(b.name,'en')),
  showMiniBadge:false,
  mascots:null,
  faceRight:ANIMAL_LOOP_FACE_RIGHT_MASCOTS,
  mode:'animal'
});
