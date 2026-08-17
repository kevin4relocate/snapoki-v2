import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {generateEchoStep,simulateEchoStep} from '../src/js/games/echo-step.js';
import {verifyAndScoreResult} from '../functions/_lib/scoring.js';

const EXPECTED={easy:{size:6,delay:2,min:8,max:11,shared:2,player:2,echo:2,phase:1},medium:{size:8,delay:3,min:28,max:28,phase:2,decoys:4},hard:{size:10,delay:4,min:42,max:42,phase:2,decoys:6}};
const DELTA={u:[-1,0],r:[0,1],d:[1,0],l:[0,-1]};
function walk(start,actions,size){let pos=start;const path=[pos];for(const action of actions){const r=Math.floor(pos/size),c=pos%size,[dr,dc]=DELTA[action];pos=(r+dr)*size+c+dc;path.push(pos);}return path;}

test('Echo Step stays deterministic and solvable across difficulties',()=>{
  for(const[difficulty,cfg]of Object.entries(EXPECTED))for(let sample=0;sample<4;sample++){
    const seed=`echo-step:${difficulty}:test:${sample}`,a=generateEchoStep(difficulty,seed),b=generateEchoStep(difficulty,seed);
    assert.equal(a.size,cfg.size);assert.equal(a.delay,cfg.delay);assert.ok(a.solutionMoves>=cfg.min&&a.solutionMoves<=cfg.max);assert.equal(a.phaseVersion,cfg.phase);assert.equal(a.generatorVersion,4);
    assert.deepEqual({blocked:a.blocked,playerBarriers:a.playerBarriers,echoBarriers:a.echoBarriers,playerStart:a.playerStart,echoStart:a.echoStart,playerGoal:a.playerGoal,echoGoal:a.echoGoal,solution:a.solution,temporal:a.temporal},{blocked:b.blocked,playerBarriers:b.playerBarriers,echoBarriers:b.echoBarriers,playerStart:b.playerStart,echoStart:b.echoStart,playerGoal:b.playerGoal,echoGoal:b.echoGoal,solution:b.solution,temporal:b.temporal});
    if(difficulty==='easy'){
      assert.equal(a.blocked.length,cfg.shared);assert.equal(a.playerBarriers.length,cfg.player);assert.equal(a.echoBarriers.length,cfg.echo);
    }else{
      assert.equal(a.temporal.goalReentry,true);assert.ok(a.temporal.delayedTraps>=cfg.decoys);assert.ok(a.temporal.decisionPoints>=cfg.decoys+1);
      assert.ok(a.blocked.length>0);assert.ok(a.playerBarriers.length>0);assert.ok(a.echoBarriers.length>0);
    }
    const walls=[...a.blocked,...a.playerBarriers,...a.echoBarriers];assert.equal(new Set(walls).size,walls.length);assert.notEqual(a.playerGoal,a.echoGoal);
    const playerPath=walk(a.playerStart,a.solution,a.size),echoPath=walk(a.echoStart,a.solution.slice(0,-a.delay),a.size);
    assert.equal(playerPath.some(i=>a.playerBarriers.includes(i)||a.blocked.includes(i)),false);assert.equal(echoPath.some(i=>a.echoBarriers.includes(i)||a.blocked.includes(i)),false);
    assert.equal(a.playerBarriers.some(i=>echoPath.includes(i)),true);assert.equal(a.echoBarriers.some(i=>playerPath.includes(i)),true);
    assert.equal(simulateEchoStep(a,a.solution.slice(0,-1)).solved,false);const result=simulateEchoStep(a,a.solution);assert.equal(result.solved,true);assert.equal(result.state.player,a.playerGoal);assert.equal(result.state.echo,a.echoGoal);assert.equal(result.state.pending.length,a.delay);
  }
});

test('Echo Step striped cells keep actor-specific rules and plain public copy',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),ui=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step.css','utf8'),config=fs.readFileSync('src/js/games-config.js','utf8'),social=fs.readFileSync('src/js/social-game-board.js','utf8');
  assert.match(core,/playerPhaseSet\(puzzle\).*playerBarriers/s);assert.match(core,/echoPhaseSet\(puzzle\).*echoBarriers/s);
  assert.match(ui,/barrier-player/);assert.match(ui,/barrier-echo/);
  assert.match(css,/\.echo-cell\.barrier-player/);assert.match(css,/\.echo-cell\.barrier-echo/);
  assert.match(config,/Purple striped cells block YOU only/);assert.match(config,/Cyan striped cells block Echo only/);assert.match(config,/Dark striped cells block both/);assert.doesNotMatch(config,/phase walls marked/);
  assert.match(social,/playerBarriers=new Set\(puzzle\.playerBarriers/);assert.match(social,/echoBarriers=new Set\(puzzle\.echoBarriers/);
});

test('Echo Step finishes only when YOU and Echo reach their goals together',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),ui=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),config=fs.readFileSync('src/js/games-config.js','utf8');
  assert.doesNotMatch(core,/settleAnimated|catching up|settleEchoState/);assert.match(core,/bothHome\(puzzle,state\)/);
  assert.match(ui,/token\.textContent='YOU'/);assert.match(ui,/token\.textContent='E'/);
  assert.match(config,/Reach YOU → P and Echo → E on the same turn/);assert.match(config,/Reaching one goal alone does not finish the puzzle/);assert.doesNotMatch(config,/Player locks in place|automatically replays every move still pending/);
});

test('Echo replay row highlights the next move and waiting goals',()=>{
  const ui=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),css=fs.readFileSync('src/styles/echo-step.css','utf8');
  assert.match(ui,/function nextEchoPreview\(\)/);assert.match(ui,/'is-next'/);assert.match(ui,/'goal-waiting'/);assert.match(ui,/'echo-next-target'/);assert.match(css,/\.echo-queue b\.is-next/);assert.match(css,/goal-waiting/);
});

test('Echo Step core stays engine-only with no obsolete renderer',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8');
  assert.doesNotMatch(core,/export function createGame|echo-controls|echo-phase-legend|solutionPlayerGuide|echo-route-arrow/);
  assert.doesNotMatch(core,/scoreFromPerformance|scoreTimeDivisor|HINT_LOOKAHEAD/);
});

test('Echo generation stays bounded and fast enough for one-board startup',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8');assert.doesNotMatch(core,/routeCandidate|120000|function dfs|while\s*\(\s*true\s*\)/);assert.match(core,/constructiveRoute/);assert.match(core,/candidateBudget:36/);assert.match(core,/candidateBudget:44/);assert.match(core,/nodeBudget=14000/);
  const samples=60,started=performance.now();for(const difficulty of Object.keys(EXPECTED))for(let sample=0;sample<samples;sample++)generateEchoStep(difficulty,`echo-step:${difficulty}:speed:${sample}`);const elapsed=performance.now()-started;assert.ok(elapsed<1500,`180 V4 boards should generate under 1.5s in CI, took ${Math.round(elapsed)}ms`);
});

test('Echo Step server verifier accepts a valid completion and rejects an altered action list',()=>{
  const difficulty='medium',seed='echo-step:medium:test:ranked-proof',puzzle=generateEchoStep(difficulty,seed),metadata={seed,moves:puzzle.solution.length,size:puzzle.size,delay:puzzle.delay,solution_moves:puzzle.solutionMoves,actions:[...puzzle.solution]};
  assert.equal(verifyAndScoreResult({game:'echo-step',difficulty,mode:'normal',time_ms:45000,hints_used:0,metadata}).ok,true);
  assert.equal(verifyAndScoreResult({game:'echo-step',difficulty,mode:'normal',time_ms:45000,hints_used:0,metadata:{...metadata,actions:[...metadata.actions,'u'],moves:metadata.moves+1}}).ok,false);
});

test('Echo Step engine files are valid JavaScript',()=>{for(const file of ['src/js/games/echo-step.js','src/js/games/echo-step-core.js','src/js/games/echo-step-ui-v32.js','src/js/social-game-board.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});});
