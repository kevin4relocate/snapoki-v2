import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildDailyContent,contentDate} from '../functions/_lib/social-content.js';

test('daily social content is deterministic per date and variant',()=>{
  const a=buildDailyContent('2026-08-16',0),b=buildDailyContent('2026-08-16',0),c=buildDailyContent('2026-08-16',1);
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,c);
  assert.equal(a.date,'2026-08-16');
  assert.ok(a.linkedIn.includes('https://snapoki.com/'));
  assert.ok(a.instagram.includes('#Snapoki'));
  assert.ok(a.x.length<=280,'X copy must stay within 280 characters');
});

test('content date follows Vietnam local day',()=>{
  assert.equal(contentDate(new Date('2026-08-16T16:30:00Z')),'2026-08-16');
  assert.equal(contentDate(new Date('2026-08-16T17:30:00Z')),'2026-08-17');
});

test('content desk storage is a singleton and predictable admin routes are gone',async()=>{
  const migration=await fs.readFile('migrations/0004_admin_social_content.sql','utf8');
  const api=await fs.readFile('functions/api/snapdesk-74kq/content.js','utf8');
  const page=await fs.readFile('public/snapdesk-74kq/index.html','utf8');
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  assert.match(migration,/PRIMARY KEY CHECK \(id = 1\)/);
  assert.match(api,/ON CONFLICT\(id\) DO UPDATE/);
  assert.match(api,/DELETE FROM admin_social_content/);
  assert.match(page,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(page,/data-private-utility="true"/);
  assert.match(page,/id="deleteTodayBtn"/);
  assert.match(page,/id="deleteAllBtn"/);
  assert.match(page,/data-copy="linkedIn"/);
  assert.match(page,/data-copy="x"/);
  assert.match(page,/data-copy="instagram"/);
  assert.match(client,/\/api\/snapdesk-74kq\/content/);
  await assert.rejects(fs.access('public/admin/index.html'));
  await assert.rejects(fs.access('functions/api/admin/content.js'));
});

test('OpenAI generation stays server-side and falls back when no key is configured',async()=>{
  const api=await fs.readFile('functions/api/snapdesk-74kq/content.js','utf8');
  const client=await fs.readFile('src/js/admin-content.js','utf8');
  assert.match(api,/env\.OPENAI_API_KEY/);
  assert.match(api,/https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(api,/gpt-5\.6-luna/);
  assert.match(api,/generator:'template'/);
  assert.match(api,/generator:'template-fallback'/);
  assert.doesNotMatch(client,/OPENAI_API_KEY/);
  assert.doesNotMatch(client,/api\.openai\.com/);
});
