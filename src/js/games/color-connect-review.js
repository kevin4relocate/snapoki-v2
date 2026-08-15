export const COLOR_CONNECT_REVIEW_SAMPLES=[
  {band:'80–87',seed:'color-v8-11-prod:h1:021',score:83.9,greedyTraps:9,backtracks:30,deadEnds:23,decisions:15,temptingRoutes:1,shortcutVictims:2},
  {band:'80–87',seed:'color-v8-11-prod:h1:019',score:84.0,greedyTraps:11,backtracks:42,deadEnds:36,decisions:17,temptingRoutes:0,shortcutVictims:0},
  {band:'80–87',seed:'color-v8-11-prod:h1:028',score:85.5,greedyTraps:9,backtracks:35,deadEnds:29,decisions:15,temptingRoutes:1,shortcutVictims:1},
  {band:'87–91',seed:'color-v8-11-prod:h1:003',score:89.1,greedyTraps:10,backtracks:31,deadEnds:28,decisions:13,temptingRoutes:2,shortcutVictims:2},
  {band:'87–91',seed:'color-v8-11-prod:h1:015',score:89.8,greedyTraps:10,backtracks:85,deadEnds:59,decisions:36,temptingRoutes:1,shortcutVictims:1},
  {band:'87–91',seed:'color-v8-11-prod:h1:001',score:90.7,greedyTraps:10,backtracks:76,deadEnds:52,decisions:34,temptingRoutes:1,shortcutVictims:2},
  {band:'91–94',seed:'color-v8-11-prod:h1:011',score:91.2,greedyTraps:8,backtracks:35,deadEnds:23,decisions:17,temptingRoutes:4,shortcutVictims:6},
  {band:'91–94',seed:'color-v8-11-prod:h1:000',score:92.7,greedyTraps:10,backtracks:55,deadEnds:45,decisions:20,temptingRoutes:2,shortcutVictims:2},
  {band:'91–94',seed:'color-v8-11-prod:h1:025',score:93.1,greedyTraps:10,backtracks:38,deadEnds:29,decisions:19,temptingRoutes:2,shortcutVictims:3},
  {band:'94+',seed:'color-v8-11-prod:h1:027',score:94.3,greedyTraps:10,backtracks:37,deadEnds:27,decisions:20,temptingRoutes:3,shortcutVictims:3},
  {band:'94+',seed:'color-v8-11-prod:h1:029',score:95.5,greedyTraps:10,backtracks:108,deadEnds:75,decisions:42,temptingRoutes:3,shortcutVictims:3},
  {band:'94+',seed:'color-v8-11-prod:h1:012',score:99.2,greedyTraps:11,backtracks:56,deadEnds:47,decisions:20,temptingRoutes:5,shortcutVictims:5}
];

export const COLOR_CONNECT_REVIEW_BANDS=['80–87','87–91','91–94','94+'];
export const DEFAULT_COLOR_CONNECT_REVIEW_SEED='color-v8-11-prod:h1:028';

export function resolveColorConnectReview(params){
  if(params?.get('review')!=='1')return null;
  const requested=params.get('reviewSeed')||DEFAULT_COLOR_CONNECT_REVIEW_SEED;
  return COLOR_CONNECT_REVIEW_SAMPLES.find(sample=>sample.seed===requested)||COLOR_CONNECT_REVIEW_SAMPLES.find(sample=>sample.seed===DEFAULT_COLOR_CONNECT_REVIEW_SEED)||null;
}

export function colorConnectReviewUrl(sample){return `/color-connect/?review=1&reviewSeed=${encodeURIComponent(sample.seed)}`;}
