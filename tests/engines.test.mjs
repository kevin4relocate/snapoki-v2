import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMaze, solveMaze} from '../src/js/games/maze.js';
import {generateNumberPath} from '../src/js/games/number-path.js';
import {generateColorConnect} from '../src/js/games/color-connect.js';
import {generateLightsOut, solveLightsOut, pressLights} from '../src/js/games/lights-out.js';
import {generateLoopPuzzle, isSingleLoop} from '../src/js/games/loop-puzzle.js';
import {areAdjacent} from '../src/js/games/utils.js';

for (const difficulty of ['easy','medium','hard']) {
  test(`Maze ${difficulty} is deterministic and solvable`, () => {
    const a = generateMaze(difficulty, `test-${difficulty}`);
    const b = generateMaze(difficulty, `test-${difficulty}`);
    assert.deepEqual(a, b);
    const path = solveMaze(a);
    assert.ok(path.length > 1);
    assert.equal(path[0], a.start);
    assert.equal(path.at(-1), a.end);
  });

  test(`Number Path ${difficulty} covers every cell exactly once`, () => {
    const puzzle = generateNumberPath(difficulty, `np-${difficulty}`);
    assert.equal(new Set(puzzle.solution).size, puzzle.size * puzzle.size);
    for (let i = 1; i < puzzle.solution.length; i++) assert.ok(areAdjacent(puzzle.solution[i-1], puzzle.solution[i], puzzle.size));
    assert.equal(puzzle.clues[0].index, puzzle.solution[0]);
    assert.equal(puzzle.clues.at(-1).index, puzzle.solution.at(-1));
  });

  test(`Color Connect ${difficulty} solution segments cover the board`, () => {
    const puzzle = generateColorConnect(difficulty, `cc-${difficulty}`);
    const cells = puzzle.segments.flatMap(segment => segment.path);
    assert.equal(cells.length, puzzle.size * puzzle.size);
    assert.equal(new Set(cells).size, cells.length);
    for (const segment of puzzle.segments) {
      assert.ok(segment.path.length >= 2);
      for (let i = 1; i < segment.path.length; i++) assert.ok(areAdjacent(segment.path[i-1], segment.path[i], puzzle.size));
    }
  });

  test(`Lights Out ${difficulty} generator creates a solvable board`, () => {
    const puzzle = generateLightsOut(difficulty, `lo-${difficulty}`);
    const solution = solveLightsOut(puzzle.board, puzzle.size);
    assert.ok(Array.isArray(solution));
    let board = Uint8Array.from(puzzle.board);
    for (const index of solution) board = pressLights(board, puzzle.size, index);
    assert.equal([...board].some(Boolean), false);
  });

  test(`Loop Puzzle ${difficulty} generator creates one closed loop`, () => {
    const puzzle = generateLoopPuzzle(difficulty, `lp-${difficulty}`);
    assert.ok(puzzle.solution.length > 4);
    assert.equal(isSingleLoop(puzzle.solution, puzzle.size), true);
    assert.ok(puzzle.clues.length > 0);
    assert.ok(puzzle.clues.every(clue => clue.value >= 0 && clue.value <= 3));
  });
}
