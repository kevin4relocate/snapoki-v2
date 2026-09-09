import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('public game copy contains no Rankings, PB or sign-in prompts',()=>{
  const build=fs.readFileSync('scripts/build.mjs','utf8');
  const page=fs.readFileSync('src/js/game-page.js','utf8');
  assert.doesNotMatch(build,/class="panel rankings"|Your best score counts|Sign in to|Google sign-in/);
  assert.doesNotMatch(page,/Sign in|Verifying this account-bound completion/);
  assert.match(build,/Play Instantly/);
  assert.match(page,/snapoki:daily:v1:/);
});
