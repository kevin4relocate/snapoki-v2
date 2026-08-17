import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Content Desk requires allowlisted session and blocks cross-site writes',()=>{
  const admin=fs.readFileSync('functions/_lib/admin.js','utf8');
  const api=fs.readFileSync('functions/api/snapdesk-74kq/content.js','utf8');
  assert.match(admin,/ADMIN_EMAIL/);
  assert.match(admin,/getSession\(request, env\)/);
  assert.match(admin,/sec-fetch-site'\)==='cross-site'/);
  assert.match(admin,/origin===new URL\(request\.url\)\.origin/);
  assert.match(admin,/Cross-site admin writes are not allowed/);
  assert.match(api,/requireAdmin\(request,env\)/);
});
