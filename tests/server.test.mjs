import test from 'node:test';
import assert from 'node:assert/strict';
import {rankingPoints,validDifficulty,validGame,validMode} from '../functions/_lib/games.js';
import {verifyAndScoreResult,expectedDailySeed} from '../functions/_lib/scoring.js';
import {regularFarmMultiplier,adjustedRegularPoints,anomalyAssessment,crossedMilestone,chooseSmartNext,DAILY_COMPLETE_BONUS} from '../functions/_lib/ranking-policy.js';
import {generateMaze,solveMaze} from '../src/js/games/maze.js';
import {generateNumberPath} from '../src/js/games/number-path.js';
import {generateColorConnect} from '../src/js/games/color-connect.js';
import {generateLightsOut} from '../src/js/games/lights-out.js';
import {generateLoopPuzzle} from '../src/js/games/loop-puzzle.js';

function mazeProof(difficulty,seed){const p=generateMaze(difficulty,seed),trace=solveMaze(p);return{seed,size:p.size,ideal_moves:trace.length-1,moves:trace.length-1,trace};}
function numberProof(difficulty,seed){const p=generateNumberPath(difficulty,seed);return{seed,size:p.size,cells:p.openCount,open_cells:p.openCount,blocked_cells:p.blocked.length,mistakes:0,path:[...p.solution]};}
function colorProof(difficulty,seed){const p=generateColorConnect(difficulty,seed);return{seed,size:p.size,paths:p.segments.length,open_cells:p.openCount,blocked_cells:p.blocked.length,redraws:0,routes:p.segments.map((segment,color)=>({color,path:[...segment.path]}))};}
function lightsProof(difficulty,seed){const p=generateLightsOut(difficulty,seed);return{seed,size:p.size,moves:p.solution.length,minimum_moves:p.minimumMoves,presses:[...p.solution]};}
function loopProof(difficulty,seed){const p=generateLoopPuzzle(difficulty,seed);return{seed,size:p.size,edges:p.solution.length,conflicts:0,clues:p.clues.length,actual_edges:[...p.solution]};}

const proofFor={maze:mazeProof,'number-path':numberProof,'color-connect':colorProof,'lights-out':lightsProof,'loop-puzzle':loopProof};

test('server game validation is sourced from the shared registry',()=>{for(const game of Object.keys(proofFor))assert.equal(validGame(game),true);assert.equal(validGame('unknown'),false);});

test('ranking points reward difficulty and performance while penalizing hints',()=>{const easy=rankingPoints({difficulty:'easy',mode:'normal',score:3000,hints:0}),hard=rankingPoints({difficulty:'hard',mode:'normal',score:3000,hints:0}),hinted=rankingPoints({difficulty:'hard',mode:'normal',score:3000,hints:2}),daily=rankingPoints({difficulty:'hard',mode:'daily',score:3000,hints:0});assert.ok(hard>easy);assert.ok(hard>hinted);assert.ok(daily>hard);});

test('difficulty and mode validation is strict',()=>{['easy','medium','hard'].forEach(value=>assert.equal(validDifficulty(value),true));['normal','daily'].forEach(value=>assert.equal(validMode(value),true));assert.equal(validDifficulty('extreme'),false);assert.equal(validMode('global'),false);});

for(const game of Object.keys(proofFor))test(`server regenerates and verifies a real ${game} proof`,()=>{const difficulty='medium',seed=`${game}:${difficulty}:server-proof`,metadata=proofFor[game](difficulty,seed),checked=verifyAndScoreResult({game,difficulty,mode:'normal',time_ms:26000,hints_used:1,metadata});assert.equal(checked.ok,true,checked.reason);assert.ok(checked.score>=250&&checked.score<5000);});

test('server ignores a forged client score because score is recomputed from proof and time',()=>{const seed='maze:easy:score-proof',metadata=mazeProof('easy',seed),checked=verifyAndScoreResult({game:'maze',difficulty:'easy',mode:'normal',time_ms:18000,hints_used:1,metadata,score:999999});assert.equal(checked.ok,true);assert.ok(checked.score<5000);});

test('server rejects a forged Maze trace through a wall',()=>{const seed='maze:easy:forged-trace',metadata=mazeProof('easy',seed);metadata.trace=[metadata.trace[0],metadata.trace.at(-1)];metadata.moves=1;const checked=verifyAndScoreResult({game:'maze',difficulty:'easy',mode:'normal',time_ms:10000,hints_used:0,metadata});assert.equal(checked.ok,false);assert.equal(checked.reason,'IMPLAUSIBLE_RESULT');});

test('server rejects incomplete Number Path proof',()=>{const seed='number-path:hard:forged-path',metadata=numberProof('hard',seed);metadata.path=metadata.path.slice(0,-1);metadata.cells=metadata.path.length;const checked=verifyAndScoreResult({game:'number-path',difficulty:'hard',mode:'normal',time_ms:20000,hints_used:0,metadata});assert.equal(checked.ok,false);});

test('server rejects Lights Out presses that do not solve the generated board',()=>{const seed='lights-out:hard:bad-presses',metadata=lightsProof('hard',seed);metadata.presses=[];metadata.moves=0;const checked=verifyAndScoreResult({game:'lights-out',difficulty:'hard',mode:'normal',time_ms:10000,hints_used:0,metadata});assert.equal(checked.ok,false);assert.equal(checked.reason,'IMPLAUSIBLE_RESULT');});

test('Daily Challenge proof must use today exact deterministic seed',()=>{const seed=expectedDailySeed('number-path','medium'),good=verifyAndScoreResult({game:'number-path',difficulty:'medium',mode:'daily',time_ms:25000,hints_used:0,metadata:numberProof('medium',seed)}),oldSeed='number-path:2000-01-01:medium',bad=verifyAndScoreResult({game:'number-path',difficulty:'medium',mode:'daily',time_ms:25000,hints_used:0,metadata:numberProof('medium',oldSeed)});assert.equal(good.ok,true,good.reason);assert.equal(bad.ok,false);assert.equal(bad.reason,'INVALID_SEED');});

test('difficulty-aware timing gives harder Maze more time before score decay',()=>{const easySeed='maze:easy:timing',hardSeed='maze:hard:timing',easy=verifyAndScoreResult({game:'maze',difficulty:'easy',mode:'normal',time_ms:60000,hints_used:0,metadata:mazeProof('easy',easySeed)}),hard=verifyAndScoreResult({game:'maze',difficulty:'hard',mode:'normal',time_ms:60000,hints_used:0,metadata:mazeProof('hard',hardSeed)});assert.equal(easy.ok,true,easy.reason);assert.equal(hard.ok,true,hard.reason);assert.ok(hard.score>easy.score);});

test('regular farming diminishes softly and Hard retains more value',()=>{assert.equal(regularFarmMultiplier('easy',0),1);assert.equal(regularFarmMultiplier('easy',6),.60);assert.equal(regularFarmMultiplier('hard',6),.92);assert.ok(adjustedRegularPoints(150,'hard',6)>adjustedRegularPoints(150,'easy',6));});

test('fair-play anomaly detection flags impossible speed without banning normal fast play',()=>{const suspicious=anomalyAssessment({game:'maze',difficulty:'hard',timeMs:900,score:4990,recentHourlyFinishes:2}),normal=anomalyAssessment({game:'maze',difficulty:'hard',timeMs:12000,score:4700,recentHourlyFinishes:10});assert.equal(suspicious.suspicious,true);assert.ok(suspicious.reasons.includes('impossible_speed'));assert.equal(normal.suspicious,false);});

test('ranking milestones detect upward threshold crossings',()=>{assert.equal(crossedMilestone(31,24),25);assert.equal(crossedMilestone(11,10),10);assert.equal(crossedMilestone(2,1),1);assert.equal(crossedMilestone(20,18),null);});

test('smart next prioritizes unfinished Daily then a reachable ranking target',()=>{const daily=chooseSmartNext({mode:'daily',difficulty:'easy',dailyCompleted:['easy'],mastery:{},currentScore:4000});assert.equal(daily.type,'daily');assert.equal(daily.difficulty,'medium');const target=chooseSmartNext({mode:'normal',difficulty:'hard',dailyCompleted:[],mastery:{easy:{complete:true},medium:{complete:true},hard:{complete:true}},nextTarget:{points_to_pass:84},rankAfter:12,bestScore:4800,currentScore:4700});assert.match(target.label,/84 pts/);assert.equal(DAILY_COMPLETE_BONUS,250);});
