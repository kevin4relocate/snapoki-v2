import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relativePath=>fs.readFileSync(path.join(root,relativePath),'utf8');

test('footer social links stay styled and responsive instead of collapsing into inline text',()=>{
  const css=read('src/styles/platform-extra.css');
  const home=read('dist/index.html');
  assert.match(home,/class="footer-social"/);
  for(const label of ['LinkedIn','Instagram','@playsnapoki','Facebook'])assert.match(home,new RegExp(`>${label}<`));
  assert.match(css,/\.footer-social\{display:flex;flex-wrap:wrap;gap:8px/);
  assert.match(css,/\.footer-social a\{display:inline-flex;align-items:center;gap:7px/);
  assert.match(css,/\.social-glyph\{[^}]*display:grid;place-items:center/);
  assert.match(css,/\.footer-social\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.footer-social a span:last-child\{[^}]*text-overflow:ellipsis/);
});
