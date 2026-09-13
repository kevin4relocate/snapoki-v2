import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ANIMAL_CHESS_PIECES,
  createAnimalChessState,
  animalChessLegalMoves,
  applyAnimalChessMove,
  animalChessDenOwner,
  animalChessTrapOwner,
  isAnimalChessRiver
} from '../src/js/games/animal-chess.js';

const moveTo=(moves,r,c)=>moves.some(move=>move.r===r&&move.c===c);
const baseState=(turn='red')=>({turn,pieces:[],moves:0,winner:null,draw:false,noCaptureMoves:0,lastMove:null});
const p=(side,type,r,c)=>({id:`${side}-${type}`,side,type,rank:ANIMAL_CHESS_PIECES[type].rank,r,c});

test('Animal Chess starts with 16 pieces and Red to move',()=>{
  const state=createAnimalChessState();
  assert.equal(state.turn,'red');
  assert.equal(state.pieces.length,16);
  assert.equal(state.pieces.filter(piece=>piece.side==='red').length,8);
  assert.equal(state.pieces.filter(piece=>piece.side==='blue').length,8);
});

test('Animal Chess board has the standard rivers, dens and traps',()=>{
  assert.equal([...Array(9)].flatMap((_,r)=>[...Array(7)].map((__,c)=>isAnimalChessRiver(r,c))).filter(Boolean).length,12);
  assert.equal(animalChessDenOwner(0,3),'blue');
  assert.equal(animalChessDenOwner(8,3),'red');
  assert.equal(animalChessTrapOwner(1,3),'blue');
  assert.equal(animalChessTrapOwner(7,3),'red');
});

test('Only the Rat enters river squares',()=>{
  const ratState=baseState('red');ratState.pieces=[p('red','rat',6,1),p('blue','cat',0,0)];
  assert.ok(moveTo(animalChessLegalMoves(ratState,'red-rat'),5,1));
  const dogState=baseState('red');dogState.pieces=[p('red','dog',6,1),p('blue','cat',0,0)];
  assert.equal(moveTo(animalChessLegalMoves(dogState,'red-dog'),5,1),false);
});

test('Rat can capture Elephant on land while Elephant cannot capture Rat',()=>{
  const ratState=baseState('red');ratState.pieces=[p('red','rat',4,3),p('blue','elephant',3,3)];
  assert.ok(moveTo(animalChessLegalMoves(ratState,'red-rat'),3,3));
  const after=applyAnimalChessMove(ratState,'red-rat',3,3);
  assert.equal(after.pieces.some(piece=>piece.id==='blue-elephant'),false);
  const elephantState=baseState('red');elephantState.pieces=[p('red','elephant',4,3),p('blue','rat',3,3)];
  assert.equal(moveTo(animalChessLegalMoves(elephantState,'red-elephant'),3,3),false);
});

test('Rat cannot capture between water and land',()=>{
  const state=baseState('red');state.pieces=[p('red','rat',3,2),p('blue','elephant',3,3)];
  assert.equal(moveTo(animalChessLegalMoves(state,'red-rat'),3,3),false);
});

test('Lion and Tiger jump a river unless a Rat blocks the water',()=>{
  const open=baseState('red');open.pieces=[p('red','tiger',6,1),p('blue','cat',0,0)];
  assert.ok(moveTo(animalChessLegalMoves(open,'red-tiger'),2,1));
  const blocked=baseState('red');blocked.pieces=[p('red','tiger',6,1),p('blue','rat',4,1),p('blue','cat',0,0)];
  assert.equal(moveTo(animalChessLegalMoves(blocked,'red-tiger'),2,1),false);
});

test('Enemy piece in your trap loses rank and can be captured by Rat',()=>{
  const state=baseState('red');state.pieces=[p('red','rat',7,2),p('blue','elephant',7,3),p('blue','cat',0,0)];
  assert.ok(moveTo(animalChessLegalMoves(state,'red-rat'),7,3));
});

test('A player cannot enter their own den and wins by entering the enemy den',()=>{
  const own=baseState('red');own.pieces=[p('red','cat',8,2),p('blue','cat',0,0)];
  assert.equal(moveTo(animalChessLegalMoves(own,'red-cat'),8,3),false);
  const attack=baseState('red');attack.pieces=[p('red','cat',1,3),p('blue','rat',8,6)];
  assert.ok(moveTo(animalChessLegalMoves(attack,'red-cat'),0,3));
  const after=applyAnimalChessMove(attack,'red-cat',0,3);
  assert.equal(after.winner,'red');
});

test('Animal Chess is registered as an unranked local board game',()=>{
  const config=fs.readFileSync('src/js/games-config.js','utf8');
  assert.match(config,/key:'animal-chess'/);
  assert.match(config,/name:'Animal Chess'/);
  assert.match(config,/category:'Board'/);
  assert.match(config,/levels:\[\['local','Local 2P'/);
  assert.match(config,/capabilities:\{hint:false,solution:false,solutionSteps:false,drag:false,daily:false,ranking:false\}/);
});

test('Site navigation creates a dedicated Board Games menu for Animal Chess',()=>{
  const source=fs.readFileSync('src/js/site.js','utf8');
  assert.match(source,/Board Games/);
  assert.match(source,/boardGamesMenuToggle/);
  assert.match(source,/a\[data-game-link="animal-chess"\]/);
  assert.match(source,/menu\?\.appendChild\(animalLink\)/);
});

test('Built Animal Chess page is public and loads the shared game shell',()=>{
  const html=fs.readFileSync('dist/animal-chess/index.html','utf8');
  assert.match(html,/data-game="animal-chess"/);
  assert.match(html,/Animal Chess/);
  assert.match(html,/Local 2 Players/);
  assert.match(html,/\/assets\/js\/game-page\.js/);
});
