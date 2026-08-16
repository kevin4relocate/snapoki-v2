import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {generateEchoStep,simulateEchoStep} from '../src/js/games/echo-step.js';
import {verifyAndScoreResult} from '../functions/_lib/scoring.js';

const EXPECTED={easy:{size:6,delay:2,min:8,max:11},medium:{size:8,delay:3,min:14,max:19},hard:{size:10,delay:4,min:22,max:30}};

test('Echo Step generates deterministic synchronized boards across all difficulties',()=>{
  for(const[difficulty,cfg]of Object.entries(EXPECTED))for(let sample=0;sample<4;sample++){
    const seed=`echo-step:${difficulty}:test:${sample}`;
    const a=generateEchoStep(difficulty,seed),b=generateEchoStep(difficulty,seed);
    assert.equal(a.size,cfg.size);assert.equal(a.delay,cfg.delay);
    assert.ok(a.solutionMoves>=cfg.min&&a.solutionMoves<=cfg.max,`${difficulty} solution length ${a.solutionMoves}`);
    assert.deepEqual({blocked:a.blocked,playerStart:a.playerStart,echoStart:a.echoStart,playerGoal:a.playerGoal,echoGoal:a.echoGoal,solution:a.solution},{blocked:b.blocked,playerStart:b.playerStart,echoStart:b.echoStart,playerGoal:b.playerGoal,echoGoal:b.echoGoal,solution:b.solution});
    assert.equal(new Set(a.blocked).size,a.blocked.length);
    for(const index of a.blocked)assert.ok(index>=0&&index<a.size*a.size);
    for(const index of [a.playerStart,a.echoStart,a.playerGoal,a.echoGoal])assert.equal(a.blocked.includes(index),false);
    assert.notEqual(a.playerGoal,a.echoGoal,'Player and Echo need separate goals');
    const beforeFinish=simulateEchoStep(a,a.solution.slice(0,-1));
    assert.equal(beforeFinish.solved,false,`${difficulty} ${sample}: puzzle must not finish one move early`);
    const result=simulateEchoStep(a,a.solution);
    assert.equal(result.solved,true,`${difficulty} ${sample}: generated route must solve`);
    assert.equal(result.state.player,a.playerGoal);
    assert.equal(result.state.echo,a.echoGoal);
    assert.equal(result.state.pending.length,a.delay,'Echo memory stays delayed; the game wins by synchronization, not by draining the queue');
  }
});

test('Echo Step no longer auto-runs Echo after Player reaches a goal',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),config=fs.readFileSync('src/js/games-config.js','utf8');
  assert.doesNotMatch(source,/settleAnimated|catching up|settleEchoState/);
  assert.match(source,/bothHome\(puzzle,state\)/);
  assert.match(source,/You are on the purple goal, but Echo is not home yet/);
  assert.match(source,/Synced! You and Echo reached home on the same turn/);
  assert.match(source,/token\.textContent='YOU'/);
  assert.match(source,/token\.textContent='E'/);
  assert.match(config,/Reaching the purple goal by yourself does not finish the puzzle/);
  assert.match(config,/matching goals on the same turn/);
  assert.doesNotMatch(config,/Player locks in place|automatically replays every move still pending/);
});

test('Echo Step solution guide follows the delayed timeline and shows directional routes',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),css=fs.readFileSync('src/styles/echo-step.css','utf8');
  assert.match(source,/echoPracticeActions=puzzle\.solution\.slice\(0,Math\.max\(0,puzzle\.solution\.length-puzzle\.delay\)\)/);
  assert.match(source,/solutionPlayerGuide=routeGuide\(puzzle\.playerStart,puzzle\.solution,puzzle\.size\)/);
  assert.match(source,/solutionEchoGuide=routeGuide\(puzzle\.echoStart,echoPracticeActions,puzzle\.size\)/);
  assert.match(source,/echo-route-arrow echo-route-arrow-/);
  assert.match(source,/marker\.goal\?'SYNC'/);
  assert.doesNotMatch(source,/routeGuide\(puzzle\.echoStart,puzzle\.solution,puzzle\.size\)/);
  assert.match(css,/\.echo-route-arrow-player/);
  assert.match(css,/\.echo-route-arrow-echo/);
  assert.match(css,/\.echo-route-step/);
});

test('Echo Step memory highlights the next replay move and goal waiting state',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),css=fs.readFileSync('src/styles/echo-step.css','utf8');
  assert.match(source,/nextReady=state\.pending\.length===puzzle\.delay/);
  assert.match(source,/'is-next'/);
  assert.match(source,/'goal-waiting'/);
  assert.match(css,/\.echo-queue b\.is-next/);
  assert.match(css,/\.echo-cell\.player-goal\.goal-waiting/);
  assert.match(css,/\.echo-cell\.echo-goal\.goal-waiting/);
});

test('Echo Step generation is bounded and does not use DFS search',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-core.js','utf8');
  assert.doesNotMatch(source,/routeCandidate|120000|function dfs/);
  assert.match(source,/constructiveRoute/);
  const started=performance.now();
  for(const difficulty of Object.keys(EXPECTED))for(let sample=0;sample<300;sample++)generateEchoStep(difficulty,`echo-step:${difficulty}:speed:${sample}`);
  const elapsed=performance.now()-started;
  assert.ok(elapsed<1500,`900 generated Echo Step boards took ${Math.round(elapsed)}ms`);
});

test('Echo Step server verifier accepts the synchronized completion proof and rejects tampering',()=>{
  const difficulty='medium',seed='echo-step:medium:test:ranked-proof',puzzle=generateEchoStep(difficulty,seed),metadata={seed,moves:puzzle.solution.length,size:puzzle.size,delay:puzzle.delay,solution_moves:puzzle.solutionMoves,actions:[...puzzle.solution]};
  const valid=verifyAndScoreResult({game:'echo-step',difficulty,mode:'normal',time_ms:45000,hints_used:0,metadata});
  assert.equal(valid.ok,true);
  assert.equal(valid.metadata.delay,puzzle.delay);
  const tampered=verifyAndScoreResult({game:'echo-step',difficulty,mode:'normal',time_ms:45000,hints_used:0,metadata:{...metadata,actions:[...metadata.actions,'u'],moves:metadata.moves+1}});
  assert.equal(tampered.ok,false);
});

test('Echo Step engine files are valid JavaScript',()=>{
  execFileSync(process.execPath,['--check','src/js/games/echo-step.js'],{stdio:'pipe'});
  execFileSync(process.execPath,['--check','src/js/games/echo-step-core.js'],{stdio:'pipe'});
});
