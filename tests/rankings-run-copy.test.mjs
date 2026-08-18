import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Rankings use concise PB copy and board-specific run counts',()=>{
  const build=fs.readFileSync('scripts/build.mjs','utf8');
  const page=fs.readFileSync('src/js/game-page.js','utf8');
  const progression=fs.readFileSync('functions/_lib/progression.js','utf8');
  const stats=fs.readFileSync('functions/_lib/player-stats.js','utf8');

  assert.match(build,/<strong>🏆 Rankings<\/strong><span>Personal Best<\/span>/);
  assert.match(build,/<p class="panel-note">Your best score counts\.<\/p>/);

  assert.match(page,/\$\{runs\} \$\{runs===1\?'run':'runs'\}/);
  assert.doesNotMatch(page,/verified completes/);
  assert.doesNotMatch(page,/rankingBoardCaption/);

  assert.match(progression,/runs:'games_completed'/);
  assert.match(progression,/runs:`\$\{value\}_clears`/);
  assert.match(stats,/s\.\$\{fields\.runs\} AS games/g);
});
