import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_LOOP_MASCOTS,WORLD_LOOP_FACE_RIGHT_MASCOTS,WORLD_LOOP_ALREADY_RIGHT_OR_NEUTRAL_MASCOTS} from '../src/js/games/world-loop.js';
const source=(readFileSync('src/js/games/world-loop.js','utf8')+'\n'+readFileSync('src/js/endless-race/engine.js','utf8')+'\n'+readFileSync('src/js/endless-race/themes/flag.js','utf8'));
const css=readFileSync('src/styles/world-loop.css','utf8');

test('racing-car mascot faces right without mirroring the attached flag',()=>{
  assert.ok(WORLD_LOOP_MASCOTS.includes('🏎️'),'Racing car must be in racer pool');
  assert.ok(WORLD_LOOP_FACE_RIGHT_MASCOTS.has('🏎️'),'Left-facing racing car must be mirrored');
  assert.match(css,/\.world-loop-mascot--face-right\{transform:scaleX\(-1\);transform-origin:center\}/);
  assert.match(source,/theme\.faceRight\.has\(racer\.mascot\)/);
  assert.match(source,/const miniBadge=theme\.showMiniBadge\?/);
  assert.doesNotMatch(css,/\.world-loop-racer-flag\s*\{[^}]*scaleX\(-1\)/);
});

test('country chooser uses a roomy 1020px card and legible four-column desktop chips',()=>{
  assert.match(css,/\.world-loop-setup-card\{\s*width:min\(1020px,100%\);/);
  assert.match(css,/\.world-loop-selected\{\s*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.world-loop-selected-chip\{\s*min-height:50px/);
  assert.match(css,/\.world-loop-selected-chip strong\{font-size:12px/);
  assert.match(css,/\.world-loop-country-trigger\{\s*min-height:52px/);
  assert.match(css,/\.world-loop-start\{\s*min-height:52px/);
});

test('search menu is as wide as its trigger and expands to two columns on desktop',()=>{
  assert.match(css,/\.world-loop-country-menu\{\s*display:flex;\s*flex-direction:column;/);
  assert.match(css,/\.world-loop-country-menu\.open-up\{\s*top:auto;/);
  assert.match(css,/\.world-loop-country-options\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source,/function positionCountryMenu\(\)/);
  assert.match(source,/countryMenu\.classList\.toggle\('open-up',openUp\)/);
  assert.match(source,/if\(opening\)\{renderCountryOptions\(\);positionCountryMenu\(\);countrySearch\.focus\(\);\}/);
});

test('responsive popup reduces chip columns and maintains a scrollable list on mobile',()=>{
  assert.match(css,/@media\(max-width:950px\)\{[\s\S]*?\.world-loop-selected\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:680px\)\{[\s\S]*?\.world-loop-selected\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:360px\)\{[\s\S]*?\.world-loop-selected\{grid-template-columns:1fr;max-height:215px\}/);
  assert.match(css,/\.world-loop-setup\{\s*padding:clamp\(18px,4vh,42px\) 16px 16px;\s*overflow-y:auto/);
});

test('all twelve racer icons have a reviewed facing direction',()=>{
  const mirrored=['🏎️','🐇','🦊','🐝','🐲','🦅','🐬','🦖'];
  const unchanged=['🚀','🤖','🛸','⚡'];
  assert.equal(WORLD_LOOP_MASCOTS.length,12);
  assert.deepEqual([...WORLD_LOOP_FACE_RIGHT_MASCOTS],mirrored);
  assert.deepEqual([...WORLD_LOOP_ALREADY_RIGHT_OR_NEUTRAL_MASCOTS],unchanged);
  assert.deepEqual([...new Set([...mirrored,...unchanged])].sort(),[...WORLD_LOOP_MASCOTS].sort(),
    'A new racer icon must be audited for left-to-right orientation');
  assert.equal(mirrored.includes('🚀'),false,'Rocket already points up/right');
  assert.equal(mirrored.includes('🛸'),false,'Symmetric UFO should not be mirrored');
});
