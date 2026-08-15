import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const extract = (html, tagClass) => {
  const start = html.indexOf(`<${tagClass.tag} class="${tagClass.className}"`);
  const end = html.indexOf(`</${tagClass.tag}>`, start);
  return html.slice(start, end + tagClass.tag.length + 3);
};

test('build produced homepage and all five clean game routes', () => {
  assert.ok(fs.existsSync(path.join(root, 'dist/index.html')));
  for (const game of GAMES) assert.ok(fs.existsSync(path.join(root, `dist/${game.slug}/index.html`)));
});

test('header and footer markup are identical on homepage and every game page', () => {
  const pages = [read('dist/index.html'), ...GAMES.map(game => read(`dist/${game.slug}/index.html`))];
  const headers = pages.map(html => extract(html, {tag:'header', className:'site-header'}));
  const footers = pages.map(html => extract(html, {tag:'footer', className:'site-footer'}));
  headers.slice(1).forEach(header => assert.equal(header, headers[0]));
  footers.slice(1).forEach(footer => assert.equal(footer, footers[0]));
});

test('all game pages use the same shared control and right-rail contract', () => {
  for (const game of GAMES) {
    const html = read(`dist/${game.slug}/index.html`);
    for (const id of ['newPuzzle','hint','solution','resetPuzzle','rankingList','profileBody','dailyProgress','resultModal']) assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, /class="panel left-panel"/);
    assert.match(html, /class="right-panel"/);
    assert.match(html, /assets\/js\/game-page\.js/);
  }
});

test('platform source contains no mutation observer or runtime schema creation', () => {
  const js = [read('src/js/site.js'), read('src/js/game-page.js')].join('\n');
  assert.doesNotMatch(js, /MutationObserver/);
  const functionFiles = ['functions/api/me.js','functions/api/results.js','functions/api/rankings.js','functions/api/profile.js','functions/api/auth/google.js'].map(read).join('\n');
  assert.doesNotMatch(functionFiles, /CREATE TABLE/i);
  assert.doesNotMatch(functionFiles, /ALTER TABLE/i);
});

test('D1 starts from one explicit migration with only core product tables', () => {
  const migration = read('migrations/0001_initial.sql');
  const tables = [...migration.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi)].map(match => match[1]);
  assert.deepEqual(tables, ['users','sessions','results']);
});

test('SEO essentials exist', () => {
  const home = read('dist/index.html');
  assert.match(home, /application\/ld\+json/);
  assert.match(home, /rel="canonical"/);
  assert.match(home, /og:image/);
  assert.ok(fs.existsSync(path.join(root,'dist/sitemap.xml')));
  assert.ok(fs.existsSync(path.join(root,'dist/robots.txt')));
});
