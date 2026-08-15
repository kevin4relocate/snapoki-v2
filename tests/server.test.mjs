import test from 'node:test';
import assert from 'node:assert/strict';
import {rankingPoints, validDifficulty, validGame, validMode} from '../functions/_lib/games.js';
import {verifyAndScoreResult, expectedDailySeed} from '../functions/_lib/scoring.js';

test('server validates the exact five game ids', () => {
  ['maze','number-path','color-connect','lights-out','loop-puzzle'].forEach(game => assert.equal(validGame(game), true));
  assert.equal(validGame('unknown'), false);
});

test('ranking points reward difficulty and performance while penalizing hints', () => {
  const easy = rankingPoints({difficulty:'easy', mode:'normal', score:3000, hints:0});
  const hard = rankingPoints({difficulty:'hard', mode:'normal', score:3000, hints:0});
  const hinted = rankingPoints({difficulty:'hard', mode:'normal', score:3000, hints:2});
  const daily = rankingPoints({difficulty:'hard', mode:'daily', score:3000, hints:0});
  assert.ok(hard > easy);
  assert.ok(hard > hinted);
  assert.ok(daily > hard);
});

test('difficulty and mode validation is strict', () => {
  ['easy','medium','hard'].forEach(value => assert.equal(validDifficulty(value), true));
  ['normal','daily'].forEach(value => assert.equal(validMode(value), true));
  assert.equal(validDifficulty('extreme'), false);
  assert.equal(validMode('global'), false);
});

test('server recomputes a plausible Maze score instead of trusting client score', () => {
  const checked = verifyAndScoreResult({game:'maze', difficulty:'easy', mode:'normal', time_ms:18000, hints_used:1, metadata:{seed:'maze:easy:test-seed', size:11, ideal_moves:30, moves:34}});
  assert.equal(checked.ok, true);
  assert.ok(checked.score > 250 && checked.score < 5000);
});

test('server rejects impossible completion metadata', () => {
  const bad = verifyAndScoreResult({game:'lights-out', difficulty:'hard', mode:'normal', time_ms:10000, hints_used:0, metadata:{seed:'lights-out:hard:test-seed', size:7, minimum_moves:12, moves:3}});
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'IMPLAUSIBLE_RESULT');
});

test('Daily Challenge result must use today exact deterministic seed', () => {
  const good = verifyAndScoreResult({game:'number-path', difficulty:'medium', mode:'daily', time_ms:25000, hints_used:0, metadata:{seed:expectedDailySeed('number-path','medium'), size:6, cells:32, open_cells:32, blocked_cells:4, mistakes:0}});
  const bad = verifyAndScoreResult({game:'number-path', difficulty:'medium', mode:'daily', time_ms:25000, hints_used:0, metadata:{seed:'number-path:2000-01-01:medium', size:6, cells:32, open_cells:32, blocked_cells:4, mistakes:0}});
  assert.equal(good.ok, true);
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'INVALID_SEED');
});

test('difficulty-aware timing gives harder games more time before score decay', () => {
  const easy = verifyAndScoreResult({game:'maze', difficulty:'easy', mode:'normal', time_ms:60000, hints_used:0, metadata:{seed:'maze:easy:test', size:11, ideal_moves:30, moves:30}});
  const hard = verifyAndScoreResult({game:'maze', difficulty:'hard', mode:'normal', time_ms:60000, hints_used:0, metadata:{seed:'maze:hard:test', size:19, ideal_moves:80, moves:80}});
  assert.equal(easy.ok, true);assert.equal(hard.ok, true);assert.ok(hard.score > easy.score);
});
