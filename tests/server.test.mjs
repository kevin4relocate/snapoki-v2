import test from 'node:test';
import assert from 'node:assert/strict';
import {rankingPoints, validDifficulty, validGame, validMode} from '../functions/_lib/games.js';

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
  assert.ok(rankingPoints({difficulty:'easy', mode:'normal', score:4900, hints:0}) > rankingPoints({difficulty:'easy', mode:'normal', score:1000, hints:0}));
});

test('difficulty and mode validation is strict', () => {
  ['easy','medium','hard'].forEach(value => assert.equal(validDifficulty(value), true));
  ['normal','daily'].forEach(value => assert.equal(validMode(value), true));
  assert.equal(validDifficulty('extreme'), false);
  assert.equal(validMode('global'), false);
});
