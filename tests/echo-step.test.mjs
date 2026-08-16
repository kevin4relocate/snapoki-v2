import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {generateEchoStep,simulateEchoStep} from '../src/js/games/echo-step.js';
import {verifyAndScoreResult} from '../functions/_lib/scoring.js';

const EXPECTED={easy:{size:6,delay:2,min:8,max:11,shared:2,player:2,echo:2},medium:{size:8,delay:3,min:14,max:19,shared:4,player:5,echo:5},hard:{size:10,delay:4,min:22,max:30,shared:8,player:10,echo:10}};
const DELTA={u:[-1,0],r:[0,1],d:[1,0],l:[0,-1]};
function walk(start,actions,size){let pos=start;const path=[pos];for(const action of actions){const r=Math.floor(pos/size),c=pos%size,[dr,dc]=DELTA[action];pos=(r+dr)*size+c+dc;path.push(pos);}return path;}

test('Echo Step stays deterministic and solvable across difficulties',()=>{
  for(const[difficulty,cfg]of Object.entries(EXPECTED))for(let sample=0;sample<4;sample++){
    const seed=`echo-step:${difficulty}:test:${sample}`,a=generateEchoStep(difficulty,seed),b=generateEchoStep(difficulty,seed);
    assert.equal(a.size,cfg.size);assert.equal(a.delay,cfg.delay);assert.ok(a.solutionMoves>=cfg.min&&a.solutionMoves<=cfg.max);
    assert.deepEqual({blocked:a.blocked,playerBarriers:a.playerBarriers,echoBarriers:a.echoBarriers,playerStart:a.playerStart,echoStart:a.echoStart,playerGoal:a.playerGoal,echoGoal:a.echoGoal,solution:a.solution},{blocked:b.blocked,playerBarriers:b.playerBarriers,echoBarriers:b.echoBarriers,playerStart:b.playerStart,echoStart:b.echoStart,playerGoal:b.playerGoal,echoGoal:b.echoGoal,solution:b.solution});
    assert.equal(a.blocked.length,cfg.shared);assert.equal(a.playerBarriers.length,cfg.player);assert.equal(a.echoBarriers.length,cfg.echo);
    const walls=[...a.blocked,...a.playerBarriers,...a.echoBarriers];assert.equal(new Set(walls).size,walls.length);assert.notEqual(a.playerGoal,a.echoGoal);
    const playerPath=walk(a.playerStart,a.solution,a.size),echoPath=walk(a.echoStart,a.solution.slice(0,-a.delay),a.size);
    assert.equal(playerPath.some(i=>a.playerBarriers.includes(i)||a.blocked.includes(i)),false);assert.equal(echoPath.some(i=>a.echoBarriers.includes(i)||a.blocked.includes(i)),false);
    assert.equal(a.playerBarriers.some(i=>echoPath.includes(i)),true);assert.equal(a.echoBarriers.some(i=>playerPath.includes(i)),true);
    assert.equal(simulateEchoStep(a,a.solution.slice(0,-1)).solved,false);const result=simulateEchoStep(a,a.solution);assert.equal(result.solved,true);assert.equal(result.state.player,a.playerGoal);assert.equal(result.state.echo,a.echoGoal);assert.equal(result.state.pending.length,a.delay);
  }
});

test('Echo Step striped cells keep actor-specific rules and plain public copy',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),css=fs.readFileSync('src/styles/echo-step.css','utf8'),config=fs.readFileSync('src/js/games-config.js','utf8'),social=fs.readFileSync('src/js/social-game-board.js','utf8');
  assert.match(core,/playerPhaseSet\(puzzle\).*playerBarriers/s);assert.match(core,/echoPhaseSet\(puzzle\).*echoBarriers/s);assert.match(core,/barrier-player/);assert.match(core,/barrier-echo/);
  assert.match(css,/\.echo-cell\.barrier-player/);assert.match(css,/\.echo-cell\.barrier-echo/);
  assert.match(config,/Purple striped cells block YOU only/);assert.match(config,/Cyan striped cells block Echo only/);assert.match(config,/Dark striped cells block both/);assert.doesNotMatch(config,/phase walls marked/);
  assert.match(social,/playerBarriers=new Set\(puzzle\.playerBarriers/);assert.match(social,/echoBarriers=new Set\(puzzle\.echoBarriers/);
});

test('Echo Step finishes only when YOU and Echo reach their goals together',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),config=fs.readFileSync('src/js/games-config.js','utf8');
  assert.doesNotMatch(core,/settleAnimated|catching up|settleEchoState/);assert.match(core,/bothHome\(puzzle,state\)/);assert.match(core,/token\.textContent='YOU'/);assert.match(core,/token\.textContent='E'/);
  assert.match(config,/Reach YOU → P and Echo → E on the same turn/);assert.match(config,/Reaching one goal alone does not finish the puzzle/);assert.doesNotMatch(config,/Player locks in place|automatically replays every move still pending/);
});

test('Echo Step Guide follows the delayed route',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),css=fs.readFileSync('src/styles/echo-step.css','utf8');
  assert.match(core,/echoPracticeActions=puzzle\.solution\.slice/);assert.match(core,/solutionPlayerGuide=routeGuide/);assert.match(core,/solutionEchoGuide=routeGuide/);assert.match(core,/marker\.goal\?'SYNC'/);assert.match(css,/\.echo-route-arrow-player/);assert.match(css,/\.echo-route-arrow-echo/);
});

test('Echo replay row highlights the next move and waiting goals',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),css=fs.readFileSync('src/styles/echo-step.css','utf8');
  assert.match(core,/function nextEchoPreview\(\)/);assert.match(core,/'is-next'/);assert.match(core,/'goal-waiting'/);assert.match(core,/'echo-next-target'/);assert.match(css,/\.echo-queue b\.is-next/);assert.match(css,/goal-waiting/);
});

test('Echo generation is bounded and avoids DFS search',()=>{
  const core=fs.readFileSync('src/js/games/echo-step-core.js','utf8');assert.doesNotMatch(core,/routeCandidate|120000|function dfs/);assert.match(core,/constructiveRoute/);assert.match(core,/selectPhaseBarriers/);
  const started=performance.now();for(const difficulty of Object.keys(EXPECTED))for(let sample=0;sample<300;sample++)generateEchoStep(difficulty,`echo-step:${difficulty}:speed:${sample}`);assert.ok(performance.now()-started<1500);
});

test('Echo Step server verifier accepts a valid completion and rejects an altered action list',()=>{
  const difficulty='medium',seed='echo-step:medium:test:ranked-proof',puzzle=generateEchoStep(difficulty,seed),metadata={seed,moves:puzzle.solution.length,size:puzzle.size,delay:puzzle.delay,solution_moves:puzzle.solutionMoves,actions:[...puzzle.solution]};
  assert.equal(verifyAndScoreResult({game:'echo-step',difficulty,mode:'normal',time_ms:45000,hints_used:0,metadata}).ok,true);
  assert.equal(verifyAndScoreResult({game:'echo-step',difficulty,mode:'normal',time_ms:45000,hints_used:0,metadata:{...metadata,actions:[...metadata.actions,'u'],moves:metadata.moves+1}}).ok,false);
});

test('Echo Step engine files are valid JavaScript',()=>{for(const file of ['src/js/games/echo-step.js','src/js/games/echo-step-core.js','src/js/social-game-board.js'])execFileSync(process.execPath,['--check',file],{stdio:'pipe'});});