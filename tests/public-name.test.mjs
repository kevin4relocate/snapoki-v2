import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compactPublicName,PUBLIC_NAME_MAX_GRAPHEMES} from '../functions/_lib/public-name.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const graphemeCount=value=>{
  if(typeof Intl!=='undefined'&&Intl.Segmenter)return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].length;
  return Array.from(value).length;
};

test('public names are capped at twelve graphemes including ellipsis',()=>{
  assert.equal(PUBLIC_NAME_MAX_GRAPHEMES,12);
  assert.equal(compactPublicName('Khoa'),'Khoa');
  const long=compactPublicName('ChristopherAlexander');
  assert.equal(graphemeCount(long),12);
  assert.match(long,/…$/);
});

test('Google auth uses given_name and never full profile name as public identity',()=>{
  const auth=read('functions/api/auth/google.js');
  assert.match(auth,/token\?\.given_name/);
  assert.doesNotMatch(auth,/token\.name\s*\|\|/);
  assert.match(auth,/compactPublicName/);
});

test('session and ranking responses clamp public names server-side',()=>{
  const authLib=read('functions/_lib/auth.js');
  const rankings=read('functions/api/rankings.js');
  assert.match(authLib,/display_name:\s*compactPublicName\(row\.display_name\)/);
  assert.match(rankings,/display_name:\s*compactPublicName\(row\.display_name\)/);
});

test('header and ranking rows protect name and points columns from overlap',()=>{
  const css=read('src/styles/ui-safety.css');
  assert.match(css,/#userName[\s\S]*max-width:12ch/);
  assert.match(css,/\.right-panel \.ranking-row[\s\S]*grid-template-columns:28px 26px minmax\(0,1fr\) minmax\(0,78px\)/);
  assert.match(css,/\.right-panel \.ranking-player[\s\S]*min-width:0[\s\S]*overflow:hidden/);
  assert.match(css,/text-overflow:ellipsis/);
});
