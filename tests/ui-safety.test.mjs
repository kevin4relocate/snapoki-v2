import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Daily sections no longer use the ambiguous same-boards eyebrow',()=>{
  const pages=['dist/index.html',...GAMES.map(game=>`dist/${game.slug}/index.html`)];
  for(const page of pages)assert.doesNotMatch(read(page),/Same boards for everyone/i);
});

test('all game pages load shared long-number overflow safety',()=>{
  for(const game of GAMES)assert.match(read(`dist/${game.slug}/index.html`),/assets\/styles\/ui-safety\.css/);
  const css=read('src/styles/ui-safety.css');
  assert.match(css,/\.right-panel \.ranking-row>strong/);
  assert.match(css,/\.profile-stats b/);
  assert.match(css,/\.mastery-level b/);
  assert.match(css,/text-overflow:ellipsis/);
  assert.match(css,/minmax\(0,78px\)/);
});
