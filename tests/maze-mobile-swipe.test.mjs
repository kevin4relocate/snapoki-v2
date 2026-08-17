import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {corridorPathForSwipe,mazeSwipeDirection} from '../src/js/games/maze.js';

const N=1,E=2,S=4,W=8;
const OPPOSITE={[N]:S,[E]:W,[S]:N,[W]:E};
function mazeFromEdges(size,edges,end=size*size-1){
  const walls=new Array(size*size).fill(N|E|S|W);
  for(const[from,to]of edges){
    const fr=Math.floor(from/size),fc=from%size,tr=Math.floor(to/size),tc=to%size;
    const dir=tr===fr-1&&tc===fc?N:tr===fr&&tc===fc+1?E:tr===fr+1&&tc===fc?S:W;
    walls[from]&=~dir;walls[to]&=~OPPOSITE[dir];
  }
  return{size,walls,start:0,end};
}

test('mobile Maze swipe follows forced corridor turns and stops at the next decision',()=>{
  const maze=mazeFromEdges(3,[[0,1],[1,2],[2,5],[5,4],[5,8]],8);
  assert.deepEqual(corridorPathForSwipe(maze,0,'right'),[1,2,5]);
  assert.deepEqual(corridorPathForSwipe(maze,0,'down'),[]);
  assert.deepEqual(corridorPathForSwipe(maze,5,'down'),[8]);
});

test('one touch gesture resolves one dominant direction only after a deliberate threshold',()=>{
  assert.equal(mazeSwipeDirection(8,5),'');
  assert.equal(mazeSwipeDirection(24,8),'right');
  assert.equal(mazeSwipeDirection(-26,3),'left');
  assert.equal(mazeSwipeDirection(4,-22),'up');
  assert.equal(mazeSwipeDirection(2,28),'down');
});

test('Maze keeps desktop controls while touch uses swipe-to-decision',()=>{
  const source=fs.readFileSync('src/js/games/maze.js','utf8');
  const presentation=fs.readFileSync('src/js/game-presentation.js','utf8');
  assert.match(source,/e\.pointerType==='touch'/);
  assert.match(source,/moveSwipeToDecision\(direction\)/);
  assert.match(source,/W:'up'/);
  assert.match(source,/for\(const next of segment\)/);
  assert.match(presentation,/swipe anywhere to travel along the corridor to the next decision/i);
});
