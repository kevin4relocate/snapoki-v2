import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAnimalChessState,animalChessAllLegalMoves,chooseAnimalChessAiMove,applyAnimalChessMove} from '../src/js/games/animal-chess.js';

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
});

test('Animal Chess premium shell includes CPU modes, player HUDs, history, sound and victory overlay',()=>{
  const source=fs.readFileSync('src/js/games/animal-chess.js','utf8');
  for(const phrase of ['vs CPU','data-ai="easy"','data-ai="hard"','animal-chess-player','MOVE HISTORY','animalChessSound','animal-chess-result','Blue is thinking'])assert.match(source,new RegExp(phrase));
});

test('Animal Chess premium board uses lacquer pieces and responsive motion polish',()=>{
  const css=fs.readFileSync('src/styles/animal-chess.css','utf8');
  for(const phrase of ['animal-chess-boardframe','animal-chess-han','animal-chess-captured','animalChessArrive','prefers-reduced-motion','animal-chess-water','COMPUTER THINKING'])assert.match(css,new RegExp(phrase));
});
