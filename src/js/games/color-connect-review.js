export const COLOR_CONNECT_REVIEW_SAMPLES=[
  {band:'75–80',seed:'color-v8-holdout-h1:hard:0097',score:77.5,greedyTraps:9,backtracks:23,deadEnds:19,decisions:13,temptingRoutes:2,shortcutVictims:3},
  {band:'75–80',seed:'color-v8-holdout-h1:hard:0159',score:77.3,greedyTraps:9,backtracks:24,deadEnds:21,decisions:12,temptingRoutes:2,shortcutVictims:2},
  {band:'75–80',seed:'color-v8-holdout-h1:hard:0070',score:77.3,greedyTraps:9,backtracks:21,deadEnds:21,decisions:9,temptingRoutes:4,shortcutVictims:6},
  {band:'80–85',seed:'color-v8-holdout-h1:hard:0015',score:82.4,greedyTraps:9,backtracks:29,deadEnds:21,decisions:17,temptingRoutes:1,shortcutVictims:1},
  {band:'80–85',seed:'color-v8-holdout-h1:hard:0050',score:82.4,greedyTraps:8,backtracks:29,deadEnds:26,decisions:11,temptingRoutes:3,shortcutVictims:3},
  {band:'80–85',seed:'color-v8-holdout-h1:hard:0127',score:82.7,greedyTraps:9,backtracks:29,deadEnds:24,decisions:15,temptingRoutes:1,shortcutVictims:1},
  {band:'85–90',seed:'color-v8-holdout-h1:hard:0087',score:87.5,greedyTraps:10,backtracks:32,deadEnds:29,decisions:13,temptingRoutes:1,shortcutVictims:2},
  {band:'85–90',seed:'color-v8-holdout-h1:hard:0101',score:87.5,greedyTraps:8,backtracks:49,deadEnds:39,decisions:19,temptingRoutes:2,shortcutVictims:3},
  {band:'85–90',seed:'color-v8-holdout-h1:hard:0190',score:87.6,greedyTraps:9,backtracks:30,deadEnds:27,decisions:12,temptingRoutes:3,shortcutVictims:3},
  {band:'90+',seed:'color-v8-holdout-h1:hard:0161',score:93.0,greedyTraps:10,backtracks:28,deadEnds:26,decisions:12,temptingRoutes:4,shortcutVictims:6},
  {band:'90+',seed:'color-v8-holdout-h1:hard:0008',score:92.7,greedyTraps:10,backtracks:48,deadEnds:39,decisions:19,temptingRoutes:2,shortcutVictims:2},
  {band:'90+',seed:'color-v8-holdout-h1:hard:0194',score:92.7,greedyTraps:10,backtracks:48,deadEnds:38,decisions:20,temptingRoutes:2,shortcutVictims:2}
];

export const COLOR_CONNECT_REVIEW_BANDS=['75–80','80–85','85–90','90+'];
export const DEFAULT_COLOR_CONNECT_REVIEW_SEED='color-v8-holdout-h1:hard:0015';

export function resolveColorConnectReview(params){
  if(params?.get('review')!=='1')return null;
  const requested=params.get('reviewSeed')||DEFAULT_COLOR_CONNECT_REVIEW_SEED;
  return COLOR_CONNECT_REVIEW_SAMPLES.find(sample=>sample.seed===requested)||COLOR_CONNECT_REVIEW_SAMPLES.find(sample=>sample.seed===DEFAULT_COLOR_CONNECT_REVIEW_SEED)||null;
}

export function colorConnectReviewUrl(sample){return `/color-connect/?review=1&reviewSeed=${encodeURIComponent(sample.seed)}`;}
