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

test('Animal Chess Premium V4 removes demo chrome and keeps one compact game topbar',()=>{
  const source=fs.readFileSync('src/js/games/animal-chess.js','utf8');
  for(const phrase of ['animal-chess-topbar','animalChessCpuSelect','animal-chess-playerstrip','animalChessBoardHud','animalChessRules','animal-chess-result','snapoki:animal-chess:v4','ArrowUp','ArrowRight','restoreBoardFocus','minimax','mobilityScore','ownDenSafety','navigator.vibrate','win-target'])assert.match(source,new RegExp(phrase));
  for(const phrase of ['animal-chess-titleblock','DOU SHOU QI · 斗兽棋','Classic jungle strategy · premium board','animal-chess-matchbar','animalChessTactical','MOVE HISTORY'])assert.doesNotMatch(source,new RegExp(phrase));
});

test('Animal Chess Premium V4 board is board-first, compact and responsive',()=>{
  const css=fs.readFileSync('src/styles/animal-chess.css','utf8');
  for(const phrase of ['animal-chess-topbar','animal-chess-playerstrip','animal-chess-boardframe','animal-chess-boardhud','animal-chess-han','animal-chess-lost','animalChessArrive','animalChessWinTarget','animalChessDenDanger','prefers-reduced-motion','animal-chess-water','focus-visible','Songti SC','Source Han Serif SC','A9','animal-chess-piece:after'])assert.match(css,new RegExp(phrase));
  assert.match(css,/body\[data-game="animal-chess"\] \.left-panel\{display:none!important\}/);
  assert.match(css,/body\[data-game="animal-chess"\] \.board-toolbar\{display:none!important\}/);
  assert.doesNotMatch(css,/\.animal-chess-titleblock/);
  assert.doesNotMatch(css,/\.animal-chess-matchbar/);
});
