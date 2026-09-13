import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAnimalChessState,animalChessAllLegalMoves,chooseAnimalChessAiMove,applyAnimalChessMove,animalChessEvaluatePosition} from '../src/js/games/animal-chess.js';

test('Animal Chess premium AI always chooses a legal deterministic move',()=>{
  const state=createAnimalChessState();
  state.turn='blue';
  const legal=animalChessAllLegalMoves(state,'blue');
  const a=chooseAnimalChessAiMove(state,'hard','blue');
  const b=chooseAnimalChessAiMove(state,'hard','blue');
  assert.deepEqual(a,b);
  assert.ok(legal.some(move=>move.pieceId===a.pieceId&&move.r===a.r&&move.c===a.c));
  const next=applyAnimalChessMove(state,a.pieceId,a.r,a.c);
  assert.equal(next.moves,1);
  assert.equal(next.turn,'red');
  assert.equal(Number.isFinite(animalChessEvaluatePosition(next,'blue')),true);
});

test('Animal Chess Expert takes an immediate winning den move',()=>{
  const state=createAnimalChessState();
  state.turn='blue';
  state.pieces=[
    {id:'blue-cat',side:'blue',type:'cat',rank:2,r:7,c:3},
    {id:'red-rat',side:'red',type:'rat',rank:1,r:0,c:0}
  ];
  const move=chooseAnimalChessAiMove(state,'hard','blue');
  assert.equal(move.pieceId,'blue-cat');
  assert.deepEqual([move.r,move.c],[8,3]);
  const won=applyAnimalChessMove(state,move.pieceId,move.r,move.c);
  assert.equal(won.winner,'blue');
});

test('Animal Chess Premium V3 shell includes CPU modes, tactical HUD, persistent preferences and keyboard board controls',()=>{
  const source=fs.readFileSync('src/js/games/animal-chess.js','utf8');
  for(const phrase of ['vs CPU','data-ai="easy"','data-ai="hard"','animal-chess-player','MOVE HISTORY','animalChessSound','animal-chess-result','animalChessTactical','snapoki:animal-chess:v3','ArrowUp','ArrowRight','requestAnimationFrame','minimax','mobilityScore','ownDenSafety'])assert.match(source,new RegExp(phrase));
});

test('Animal Chess Premium V3 board uses lacquer depth, stronger readability, keyboard focus and responsive motion polish',()=>{
  const css=fs.readFileSync('src/styles/animal-chess.css','utf8');
  for(const phrase of ['animal-chess-boardframe','animal-chess-han','animal-chess-captured','animalChessArrive','prefers-reduced-motion','animal-chess-water','COMPUTER THINKING','focus-visible','Songti SC','Source Han Serif SC','A9','animal-chess-piece:after'])assert.match(css,new RegExp(phrase));
});
