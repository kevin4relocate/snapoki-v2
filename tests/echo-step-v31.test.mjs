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

test('Echo Step V3.1 Hint is a short route guide rather than one highlighted square',()=>{
  const source=fs.readFileSync('src/js/games/echo-step-core.js','utf8'),polish=fs.readFileSync('src/styles/echo-step-polish.css','utf8');
  assert.match(source,/const HINT_LOOKAHEAD=3/);
  assert.match(source,/forecastEchoStep/);
  assert.match(source,/hintActions=puzzle\.solution\.slice\(actions\.length,actions\.length\+HINT_LOOKAHEAD\)/);
  assert.match(source,/3-move route hint/);
  assert.match(source,/3-move forecast is already on the board/);
  assert.match(source,/echo-hint-arrow echo-hint-arrow-/);
  assert.match(source,/echo-hint-step echo-hint-step-/);
  assert.doesNotMatch(source,/classList\.add\('hinted'\)/);
  assert.match(polish,/\.echo-cell\.hint-player/);
  assert.match(polish,/\.echo-cell\.hint-echo/);
  assert.match(polish,/\.echo-hint-arrow-player/);
  assert.match(polish,/\.echo-hint-step-echo/);
});

test('Echo Step homepage, blog and guide are visible in the launch preview',()=>{
  const integration=fs.readFileSync('scripts/echo-step-integration.mjs','utf8');
  const finalPass=fs.readFileSync('scripts/echo-launch-final.mjs','utf8');
  assert.match(integration,/data-echo-step-spotlight/);
  assert.match(integration,/data-echo-guide-v31/);
  assert.match(finalPass,/Echo Step launch pass complete/);

  const home=fs.readFileSync('dist/index.html','utf8'),blog=fs.readFileSync('dist/blog/index.html','utf8'),guide=fs.readFileSync('dist/blog/how-to-play-echo-step/index.html','utf8'),echoPage=fs.readFileSync('dist/echo-step/index.html','utf8'),headers=fs.readFileSync('dist/_headers','utf8');
  assert.match(home,/href="\/echo-step\/"/);
  assert.match(home,/data-echo-step-spotlight/);
  assert.match(blog,/href="\/blog\/how-to-play-echo-step\/"/);
  assert.match(guide,/data-echo-guide-v31/);
  assert.match(guide,/How (?:the )?Hint works/);
  assert.match(guide,/How Guide works/);
  assert.doesNotMatch(headers,/\/echo-step\/\*[\s\S]*X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.doesNotMatch(headers,/\/blog\/how-to-play-echo-step\/\*[\s\S]*X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.match(echoPage,/\/assets\/styles\/echo-step-polish\.css/);
  assert.match(echoPage,/\/assets\/styles\/echo-step-launch\.css/);
});
