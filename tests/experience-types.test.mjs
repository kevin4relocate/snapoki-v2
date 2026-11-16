import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES,EXPERIENCE_TYPES,withContract} from '../src/js/games-config.js';
import {getGameGuide} from '../src/js/game-guide.js';
import {getGamePresentation} from '../src/js/game-presentation.js';

const read=path=>fs.readFileSync(path,'utf8');
const boardFixture={
  key:'future-animal-chess',slug:'future-animal-chess',name:'Animal Chess',
  description:'Choose a local opponent and use legal moves to capture pieces.',
  experienceType:'board',category:'Board',
  howTo:['Pick one of your own pieces.','Move onto a legal square.','Win by reaching the den or defeating the opponent.','Choose another opponent to play again.'],
  levels:[['local','Two Players','local match']],
  capabilities:{hint:false,solution:false,daily:false,ranking:false},
  guide:{
    focus:'Animal Chess is a two-player strategy game played on a board with terrain, turns and piece ranks.',
    tips:['Protect your den before capturing pieces.','Check the next reply after a move.','Use special terrain to defend.'],
    mistakes:['Forgetting whose turn comes next.','Overlooking river traps.'],
    controls:{heading:'Playing a match',body:'Select a piece, choose a highlighted legal destination, and use New Game to start again.'},
    format:{heading:'Winning a match',body:'Red moves first. Capture the opponent’s pieces or reach the enemy den. There are no Daily puzzle boards.'},
    difficultyCopy:'The match uses one 7×9 board. Opponent settings change the challenge, not the board size.',
    ctaCopy:'Try Local 2P or a computer opponent, then make the opening move.'
  }
};

test('board and simulation defaults stay unranked without explicit overrides',()=>{
  for(const type of ['board','simulation']){
    const config=withContract({...boardFixture,experienceType:type,capabilities:undefined,ranking:undefined,guide:undefined});
    assert.equal(config.experienceType,type);
    for(const capability of ['hint','solution','solutionSteps','daily','ranking'])assert.equal(config.capabilities[capability],false);
    assert.equal(config.ranking.enabled,false);
    assert.equal(config.ranking.proofType,'none');
  }
  const puzzle=withContract({...boardFixture,experienceType:'puzzle',capabilities:undefined,ranking:undefined});
  assert.equal(puzzle.capabilities.daily,true);
  assert.equal(puzzle.capabilities.hint,true);
});

test('all registered games declare a supported type and compatible capabilities',()=>{
  assert.deepEqual([...EXPERIENCE_TYPES],['puzzle','board','simulation']);
  assert.equal(GAMES.filter(g=>g.experienceType==='puzzle').length,7);
  assert.equal(GAMES.filter(g=>g.experienceType==='simulation').length,2);
  for(const game of GAMES){
    assert.ok(EXPERIENCE_TYPES.includes(game.experienceType),game.key);
    if(game.experienceType!=='puzzle'){
      assert.equal(game.capabilities.daily,false);
      assert.equal(game.capabilities.ranking,false);
      assert.equal(game.ranking.enabled,false);
    }
  }
});

test('board game guide uses its own rules and never borrows endless-race text',()=>{
  const guide=getGameGuide(boardFixture);
  assert.equal(guide.controls.heading,'Playing a match');
  assert.equal(guide.format.heading,'Winning a match');
  assert.equal(guide.difficultyCopy,boardFixture.guide.difficultyCopy);
  assert.equal(guide.ctaCopy,boardFixture.guide.ctaCopy);
  assert.deepEqual(guide.tips,boardFixture.guide.tips);
  assert.doesNotMatch(JSON.stringify(guide),/no finish line|racer distance|country selection|scrolling camera/i);
  const defaults=getGameGuide({...boardFixture,key:'unlisted-board',guide:undefined});
  assert.equal(defaults.format.heading,'Match format');
  assert.match(defaults.controls.body,/match rules/);
  assert.doesNotMatch(JSON.stringify(defaults),/no finish line|racer distance|country selection/i);
});

test('future simulation guide is separate from special World Loop endless-race copy',()=>{
  const fake={key:'future-simulation',name:'Future Simulation',description:'Watch a changing virtual system.',experienceType:'simulation',howTo:['Set up the scene.','Press Start.','Adjust the controls.'],capabilities:{daily:false}};
  const generic=getGameGuide(fake);
  const world=getGameGuide(GAMES.find(g=>g.key==='world-loop'));
  assert.equal(generic.format.heading,'Simulation format');
  assert.doesNotMatch(JSON.stringify(generic),/no finish line|racer|country selection/i);
  assert.equal(world.format.heading,'Endless format');
  assert.match(world.format.body,/no finish line/i);
  assert.match(world.controls.body,/Stop returns to country selection/);
});

test('normal puzzles retain their unique copy and Daily Challenge description',()=>{
  for(const game of GAMES.filter(g=>g.experienceType==='puzzle')){
    const guide=getGameGuide(game);
    assert.equal(guide.format.heading,'Daily Challenge');
    assert.match(guide.format.body,/UTC date/);
    assert.ok(guide.tips.length>=3,`${game.key} should retain game-specific tips`);
    assert.ok(guide.mistakes.length>=3,`${game.key} should retain mechanic-specific pitfalls`);
    const html=read(`dist/blog/how-to-play-${game.slug}/index.html`);
    assert.match(html,/Hints and practice/);
    assert.match(html,/Daily Challenge/);
  }
  const noDaily={...GAMES[0],capabilities:{...GAMES[0].capabilities,daily:false}};
  assert.equal(getGameGuide(noDaily).format.heading,'Play format');
});

test('type-safe presentation fallback does not show Hint/Solution on board games',()=>{
  const p=getGamePresentation(boardFixture);
  assert.deepEqual(p.styles,[]);
  assert.match(p.goal.note,/legal moves/);
  assert.ok(!p.tools.some(([label])=>['Hint','Solution'].includes(label)));
  const sim=getGamePresentation({key:'future-sim',name:'Future Sim',experienceType:'simulation',howTo:['Start','Observe','Reset']});
  assert.match(sim.socialHook,/What happens/);
  const puzzle=getGamePresentation({key:'future-puzzle',name:'Future Puzzle',howTo:['Start','Follow','Finish']});
  assert.deepEqual(puzzle.goal.tokens,['FUTURE PUZZLE']);
});

test('generated World Loop guide retains correct simulation content, not generic puzzle instructions',()=>{
  const html=read('dist/blog/how-to-play-world-loop/index.html');
  assert.match(html,/<h2>Endless format<\/h2>/);
  assert.match(html,/<h2>Controls and observation<\/h2>/);
  assert.match(html,/no finish line/);
  assert.doesNotMatch(html,/Complete Easy, Medium and Hard|Hint gives a limited concrete next action/);
});

test('game-guide generator is reusable and requires no post-build HTML replacement script',()=>{
  const launch=read('scripts/launch-readiness.mjs');
  const pkg=JSON.parse(read('package.json'));
  assert.match(launch,/getGameGuide\(g\)/);
  assert.doesNotMatch(launch,/g\.capabilities\?\.daily===false\?'Race pace changes|This experience is designed for watching rather than solving/);
  assert.doesNotMatch(pkg.scripts.build,/animal-chess-guide-fix|guide-patch/i);
  const home=read('dist/index.html'),blog=read('dist/blog/index.html');
  assert.match(home,/logic puzzles, board games, and interactive simulations/);
  assert.doesNotMatch(blog,/all (?:eight|nine|\d+) Snapoki puzzle games/i);
  assert.match(blog,/Game guides/);
});
