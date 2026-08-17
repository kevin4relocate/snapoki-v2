import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mazeGrabDirection,mazeGrabHit} from '../src/js/games/maze.js';

test('Maze mobile grab converts finger travel into one dominant direction after a small dead zone',()=>{
  assert.equal(mazeGrabDirection(5,4),'');
  assert.equal(mazeGrabDirection(14,3),'right');
  assert.equal(mazeGrabDirection(-16,2),'left');
  assert.equal(mazeGrabDirection(3,-15),'up');
  assert.equal(mazeGrabDirection(2,18),'down');
});

test('Maze mobile grab uses a generous touch target around the real purple marker',()=>{
  const size=32,display=344,cell=display/size,cx=cell/2,cy=cell/2;
  assert.equal(mazeGrabHit(0,size,display,cx,cy),true);
  assert.equal(mazeGrabHit(0,size,display,cx+18,cy),true);
  assert.equal(mazeGrabHit(0,size,display,cx+34,cy),false);
});

test('touch grab can never teleport the Maze player from finger coordinates',()=>{
  const source=fs.readFileSync('src/js/games/maze.js','utf8');
  const touchBlock=source.match(/function followTouchGrab\([\s\S]*?function beginTouchGrab/)?.[0]||'';
  assert.match(touchBlock,/moveDirection\(direction\)/);
  assert.doesNotMatch(touchBlock,/visualAt\(/);
  assert.doesNotMatch(touchBlock,/cellAt\(/);
  assert.doesNotMatch(touchBlock,/moveTo\(/);
  assert.match(source,/function canMoveBetween\(/);
  assert.match(source,/return target>=0\?moveTo\(target\):false/);
  assert.match(source,/loops<4/);
  assert.doesNotMatch(source,/corridorPathForSwipe|moveSwipeToDecision|swipe anywhere/i);
});

test('Maze touch requires a brief hold on the purple marker and releases control on pointer up',()=>{
  const source=fs.readFileSync('src/js/games/maze.js','utf8');
  const presentation=fs.readFileSync('src/js/game-presentation.js','utf8');
  assert.match(source,/mazeGrabHit\(player/);
  assert.match(source,/holdTimer=setTimeout/);
  assert.match(source,/state\.grabbed=true/);
  assert.match(source,/},150\)/);
  assert.match(source,/canvas\.addEventListener\('pointerup'/);
  assert.match(source,/clearDrag\(\)/);
  assert.match(source,/drawGrabHighlight/);
  assert.match(presentation,/briefly hold the purple marker to grab it/i);
});

test('Maze blocks browser scrolling gestures during board touch while desktop controls stay unchanged',()=>{
  const source=fs.readFileSync('src/js/games/maze.js','utf8');
  assert.match(source,/touchAction:'none'/);
  assert.match(source,/overscrollBehavior:'contain'/);
  assert.match(source,/setPointerCapture/);
  assert.match(source,/e\.preventDefault\(\)/);
  assert.match(source,/W:'up',D:'right',S:'down',A:'left'/);
  assert.match(source,/getCoalescedEvents/);
});
