import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advanceEchoState,forecastEchoStep,generateEchoStep} from '../src/js/games/echo-step.js';

test('Echo Step V3.1 Hint forecasts three YOU moves and the exact delayed Echo consequence',()=>{
  for(const difficulty of ['easy','medium','hard']){
    const puzzle=generateEchoStep(difficulty,`echo-v31-hint:${difficulty}`);
    let state={player:puzzle.playerStart,echo:puzzle.echoStart,pending:[]};
    for(let i=0;i<puzzle.delay;i++){
      const next=advanceEchoState(puzzle,state,puzzle.solution[i]);
      assert.equal(next.ok,true);state=next.state;
    }
    const nextThree=puzzle.solution.slice(puzzle.delay,puzzle.delay+3),forecast=forecastEchoStep(puzzle,state,nextThree);
    assert.equal(forecast.ok,true);
    assert.equal(forecast.playerSteps.length,nextThree.length);
    assert.equal(forecast.echoSteps.length,nextThree.length);
    assert.deepEqual(forecast.echoSteps.map(step=>step.action),puzzle.solution.slice(0,nextThree.length));
  }
});

test('Echo Step Hint is a short route guide rather than one highlighted square',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-ui-v32.js','utf8'),polish=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/const HINT_LOOKAHEAD=3/);
  assert.match(source,/forecastEchoStep/);
  assert.match(source,/hintActions=puzzle\.solution\.slice\(actions\.length,actions\.length\+HINT_LOOKAHEAD\)/);
  assert.match(source,/3-move hint/);
  assert.match(source,/Make one move before asking for another forecast/);
  assert.match(source,/guide\.set\(step\.to,/);
  assert.doesNotMatch(source,/guide\.set\(step\.from,/);
  assert.match(source,/echo-hint-arrow echo-hint-arrow-/);
  assert.match(source,/echo-hint-step echo-hint-step-/);
  assert.doesNotMatch(source,/classList\.add\('hinted'\)/);
  assert.match(polish,/\.echo-cell\.hint-player/);
  assert.match(polish,/\.echo-cell\.hint-echo/);
  assert.match(polish,/\.echo-hint-arrow-player/);
  assert.match(polish,/\.echo-hint-step-echo/);
});

test('Echo Step launch surfaces come from shared registries instead of Echo-only build passes',()=>{
  const presentation=fs.readFileSync('src/js/game-presentation.js','utf8');
  const launch=fs.readFileSync('scripts/launch-readiness.mjs','utf8');
  assert.match(presentation,/'echo-step'/);
  assert.match(presentation,/styles:\['echo-step\.css','echo-step-polish\.css','echo-step-rulebar\.css'\]/);
  assert.match(presentation,/spotlight:/);
  assert.match(launch,/key==='echo-step'/);
  assert.match(launch,/'echo-step':\{focus:/);
  assert.equal(fs.existsSync('scripts/echo-step-integration.mjs'),false);
  assert.equal(fs.existsSync('scripts/echo-launch-final.mjs'),false);

  const home=fs.readFileSync('dist/index.html','utf8'),blog=fs.readFileSync('dist/blog/index.html','utf8'),guide=fs.readFileSync('dist/blog/how-to-play-echo-step/index.html','utf8'),echoPage=fs.readFileSync('dist/echo-step/index.html','utf8'),headers=fs.readFileSync('dist/_headers','utf8');
  assert.match(home,/href="\/echo-step\/"/);
  assert.match(home,/data-game-spotlight="echo-step"/);
  assert.match(blog,/href="\/blog\/how-to-play-echo-step\/"/);
  assert.match(guide,/Every move matters twice|plan one command sequence for two moments/i);
  assert.match(guide,/three-move Hint|Hint/);
  assert.match(guide,/Guide/);
  assert.doesNotMatch(headers,/\/echo-step\/\*[\s\S]*X-Robots-Tag: noindex/i);
  assert.doesNotMatch(headers,/\/blog\/how-to-play-echo-step\/\*[\s\S]*X-Robots-Tag: noindex/i);
  assert.match(echoPage,/\/assets\/styles\/echo-step-polish\.css/);
  assert.match(echoPage,/\/assets\/styles\/how-to-card\.css/);
  assert.doesNotMatch(echoPage,/echo-step-launch\.css/);
});
