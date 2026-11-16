import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AQUARIUM_THEME,AQUARIUM_CREATURES} from '../src/js/ambient/themes/aquarium.js';
import {createSwimmers,stepSwimmers,safeSwimSelection,SWIM_SPEED} from '../src/js/ambient/swim.js';
import {createAmbientExperience} from '../src/js/ambient/engine.js';
import {generateAquariumLoop,createGame} from '../src/js/games/aquarium-loop.js';
import {GAMES} from '../src/js/games-config.js';

const read=path=>fs.readFileSync(path,'utf8');

test('Aquarium is a standalone Ambient Engine, not a duplicated race engine',()=>{
  const entry=read('src/js/games/aquarium-loop.js'),engine=read('src/js/ambient/engine.js');
  assert.match(entry,/from '\.\.\/ambient\/engine\.js'/);
  assert.match(engine,/from '\.\/swim\.js'/);
  assert.equal(typeof createGame,'function');
  assert.equal(typeof createAmbientExperience,'function');
  assert.doesNotMatch(engine,/worldLoop|orderHost|raceLeader|cameraDistance|leaderGap/);
  assert.match(engine,/requestAnimationFrame\(frame\)/);
  assert.match(engine,/document\.visibilityState==='hidden'/);
  assert.match(engine,/cancelAnimationFrame/);
  assert.match(engine,/AudioContext/);
  assert.match(engine,/fullscreenchange/);
  const game=GAMES.find(item=>item.key==='aquarium-loop');
  assert.equal(game.experienceType,'simulation');
  assert.equal(game.capabilities.daily,false);
  assert.equal(game.capabilities.ranking,false);
});

test('Aquarium data offers 16 unique species and isolated local roster',()=>{
  assert.equal(AQUARIUM_CREATURES.length,16);
  assert.equal(AQUARIUM_THEME.defaultCodes.length,8);
  assert.equal(new Set(AQUARIUM_CREATURES.map(item=>item.code)).size,16);
  assert.equal(new Set(AQUARIUM_CREATURES.map(item=>item.name)).size,16);
  assert.ok(AQUARIUM_CREATURES.every(item=>item.emoji.length>0&&item.name));
  assert.equal(AQUARIUM_THEME.storageKey,'snapoki:aquarium-loop:roster:v1');
  assert.notEqual(AQUARIUM_THEME.storageKey,'snapoki:world-loop:roster:v1');
  assert.notEqual(AQUARIUM_THEME.storageKey,'snapoki:animal-loop:roster:v1');
});

test('sea creatures wander deterministically inside the tank for sustained sessions',()=>{
  const chosen=AQUARIUM_THEME.items.slice(0,8);
  const first=createSwimmers(chosen,'seed:one'),second=createSwimmers(chosen,'seed:one');
  const initial=first.map(s=>[s.x,s.y,s.vx,s.vy,s.targetX,s.targetY]);
  assert.deepEqual(initial,second.map(s=>[s.x,s.y,s.vx,s.vy,s.targetX,s.targetY]));
  for(let i=0;i<5000;i++){
    stepSwimmers(first,1/60,'medium');
    stepSwimmers(second,1/60,'medium');
    for(const s of first){
      assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.vx)&&Number.isFinite(s.vy));
      assert.ok(s.x>=.085&&s.x<=.915&&s.y>=.13&&s.y<=.77,
        'swimmer should never leave the 2-D aquarium');
      assert.ok(Math.abs(s.angle)<=12,'vertical steering should stay gentle');
    }
  }
  assert.ok(first.some((s,i)=>Math.hypot(s.x-initial[i][0],s.y-initial[i][1])>.025));
  assert.deepEqual(first.map(s=>[s.x,s.y,s.vx,s.vy,s.targetX,s.targetY]),
    second.map(s=>[s.x,s.y,s.vx,s.vy,s.targetX,s.targetY]));
});

test('Drift/Flow/Playful offer true speed presets without species advantages',()=>{
  assert.ok(SWIM_SPEED.easy<SWIM_SPEED.medium&&SWIM_SPEED.medium<SWIM_SPEED.hard);
  const choices=AQUARIUM_THEME.items.slice(0,4);
  const slow=createSwimmers(choices,'seed:modes');
  const fast=createSwimmers(choices,'seed:modes');
  for(let i=0;i<120;i++){stepSwimmers(slow,1/60,'easy');stepSwimmers(fast,1/60,'hard');}
  const travel=(arr,orig)=>arr.reduce((sum,s,i)=>sum+Math.hypot(s.x-orig[i].x,s.y-orig[i].y),0);
  const origin=createSwimmers(choices,'seed:modes');
  assert.ok(travel(fast,origin)>travel(slow,origin));
  assert.ok(!read('src/js/ambient/swim.js').includes('speciesSpeed'));
  assert.equal(stepSwimmers(slow,0,'medium'),slow);
  assert.equal(stepSwimmers(slow,Infinity,'medium'),slow);
});

test('the selector validates 4–12 creatures and recovers invalid local state',()=>{
  for(const invalid of ['',null,'{}','true','[1,null]','["XX"]','[]','bad json']){
    assert.deepEqual(safeSwimSelection(AQUARIUM_THEME,invalid),[...AQUARIUM_THEME.defaultCodes]);
  }
  assert.deepEqual(safeSwimSelection(AQUARIUM_THEME,JSON.stringify(['SH','DO','SH','TU','SQ','BAD'])),['SH','DO','TU','SQ']);
  assert.equal(safeSwimSelection(AQUARIUM_THEME,JSON.stringify(AQUARIUM_CREATURES.map(x=>x.code))).length,12);
  assert.throws(()=>createSwimmers(AQUARIUM_CREATURES.slice(0,3),'invalid'),RangeError);
  assert.throws(()=>createSwimmers(AQUARIUM_CREATURES.slice(0,13),'invalid'),RangeError);
});

test('Aquarium builds a separate guide and browser-only immersive assets',()=>{
  const game=GAMES.find(item=>item.slug==='aquarium-loop');
  assert.ok(game);
  assert.match(game.seoTitle,/Aquarium Loop/);
  const page=read('dist/aquarium-loop/index.html');
  const manifest=JSON.parse(read('dist/release.json'));
  assert.match(page,/class="game-layout world-loop-layout"/);
  assert.match(page,/data-game="aquarium-loop"/);
  assert.doesNotMatch(page,/class="section daily-section"|class="panel left-panel"/);
  assert.ok(page.includes(manifest.assetsBase+'styles/aquarium-loop.css'));
  assert.ok(manifest.assets['js/ambient/engine.js']);
  assert.ok(manifest.assets['js/ambient/swim.js']);
  assert.ok(manifest.assets['js/ambient/themes/aquarium.js']);
  assert.ok(fs.existsSync('dist/blog/how-to-play-aquarium-loop/index.html'));
  assert.match(read('dist/sitemap.xml'),/https:\/\/snapoki\.com\/aquarium-loop\//);
  assert.match(read('dist/index.html'),/href="\/aquarium-loop\//);
  const preview=generateAquariumLoop('medium','share:test');
  assert.equal(preview.swimmers.length,8);
  assert.ok(preview.swimmers.every(s=>s.emoji&&!s.flag));
  const renderer=read('src/js/social-renderers/aquarium-loop.js');
  assert.match(renderer,/export function drawSocialBoard\(/);
});
