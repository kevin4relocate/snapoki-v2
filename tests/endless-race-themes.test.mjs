import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES} from '../src/js/games-config.js';
import {FLAG_THEME,WORLD_LOOP_COUNTRIES,restoreWorldLoopSelection} from '../src/js/games/world-loop.js';
import {ANIMAL_THEME,ANIMAL_LOOP_ANIMALS,generateAnimalLoop} from '../src/js/games/animal-loop.js';
import {buildEndlessRaceRoster,sortRaceCodes,restoreRaceSelection,createEndlessRace} from '../src/js/endless-race/engine.js';

const read=p=>fs.readFileSync(p,'utf8');

test('both entries share exactly one race engine, not duplicated race loops',()=>{
  const flag=read('src/js/games/world-loop.js'),animal=read('src/js/games/animal-loop.js'),engine=read('src/js/endless-race/engine.js');
  assert.match(flag,/import \{createEndlessRace\} from '\.\.\/endless-race\/engine\.js'/);
  assert.match(animal,/import \{createEndlessRace,buildEndlessRaceRoster\} from '\.\.\/endless-race\/engine\.js'/);
  assert.equal(typeof createEndlessRace,'function');
  assert.match(engine,/function stepRace\(dt\)/);
  assert.match(engine,/function renderOrder\(ordered\)/);
  assert.match(engine,/async function toggleBackgroundMusic\(\)/);
  assert.doesNotMatch(flag,/function stepRace|requestAnimationFrame\(/);
  assert.doesNotMatch(animal,/function stepRace|requestAnimationFrame\(/);
});

test('Flag retains 196 choices, original URL and local selection storage',()=>{
  assert.equal(FLAG_THEME.mode,'flag');
  assert.equal(FLAG_THEME.storageKey,'snapoki:world-loop:roster:v1');
  assert.equal(WORLD_LOOP_COUNTRIES.length,196);
  assert.equal(FLAG_THEME.items.length,196);
  assert.equal(GAMES.find(g=>g.key==='world-loop').slug,'world-loop');
  assert.deepEqual(restoreRaceSelection(FLAG_THEME,'{"bad":true}'),restoreWorldLoopSelection('{"bad":true}'));
});

test('Animal adds 24 flag-free choices with independent settings and deterministic racers',()=>{
  assert.equal(ANIMAL_THEME.mode,'animal');
  assert.equal(ANIMAL_THEME.items.length,24);
  assert.equal(ANIMAL_LOOP_ANIMALS.length,24);
  assert.notEqual(ANIMAL_THEME.storageKey,FLAG_THEME.storageKey);
  assert.equal(ANIMAL_THEME.showMiniBadge,false);
  assert.equal(new Set(ANIMAL_LOOP_ANIMALS.map(x=>x.code)).size,24);
  assert.ok(ANIMAL_LOOP_ANIMALS.every(x=>x.emoji && x.flag===x.emoji));
  assert.equal(GAMES.find(g=>g.key==='animal-loop').experienceType,'simulation');
  const first=generateAnimalLoop('medium','test:seed');
  assert.deepEqual(first,generateAnimalLoop('medium','test:seed'));
  assert.equal(first.racers.length,8);
  assert.ok(first.racers.every(r=>r.mascot===r.flag && r.label===r.name));
  const reordered=buildEndlessRaceRoster(ANIMAL_THEME,['TL','RB','FX','PD'],'custom:seed','easy');
  assert.deepEqual(reordered.map(r=>r.code),['TL','RB','FX','PD']);
  assert.deepEqual(sortRaceCodes(ANIMAL_THEME,['TL','RB','FX']),['FX','RB','TL']);
});

test('theme selection validates and caps a malformed local roster',()=>{
  const defaults=sortRaceCodes(ANIMAL_THEME,ANIMAL_THEME.defaultCodes);
  for(const raw of ['not json','null','{}','[true,null,42]','[]','["ZZ"]'])assert.deepEqual(restoreRaceSelection(ANIMAL_THEME,raw),defaults);
  const selected=restoreRaceSelection(ANIMAL_THEME,JSON.stringify(['RB','FX','TL','RB','PD','ZZ']));
  assert.deepEqual(selected,sortRaceCodes(ANIMAL_THEME,['RB','FX','TL','PD']));
  assert.ok(selected.length>=4&&selected.length<=12);
});

test('both simulations build real pages, guides and immutable shared engine assets',()=>{
  const manifest=JSON.parse(read('dist/release.json'));
  for(const slug of ['world-loop','animal-loop']){
    const page=read(`dist/${slug}/index.html`);
    assert.ok(page.includes(`data-game="${slug}"`));
    assert.match(page,/class="game-layout world-loop-layout"/);
    assert.doesNotMatch(page,/class="panel left-panel"|class="right-panel"|class="section daily-section"/);
    assert.ok(page.includes(manifest.assetsBase+'js/game-page.js'));
    assert.ok(page.includes(manifest.assetsBase+'styles/world-loop.css'));
    assert.ok(fs.existsSync(`dist/blog/how-to-play-${slug}/index.html`));
    assert.ok(fs.existsSync(`dist/brand/guides/${slug}.svg`));
    assert.match(read('dist/sitemap.xml'),new RegExp('<loc>https://snapoki.com/'+slug+'/</loc>'));
  }
  assert.ok(manifest.assets['js/endless-race/engine.js']);
  assert.ok(manifest.assets['js/endless-race/themes/flag.js']);
  assert.ok(manifest.assets['js/endless-race/themes/animal.js']);
  assert.ok(manifest.assets['styles/animal-loop.css']);
  assert.match(read('dist/animal-loop/index.html'),/styles\/animal-loop\.css/);
  assert.match(read('dist/index.html'),/href="\/animal-loop\//);
});
