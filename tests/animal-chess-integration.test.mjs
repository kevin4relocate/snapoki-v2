import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAMES} from '../src/js/games-config.js';
import {getGameGuide} from '../src/js/game-guide.js';
import {getGamePresentation} from '../src/js/game-presentation.js';
import {RESULT_VERIFIERS,verifyAndScoreResult} from '../functions/_lib/scoring.js';
import {createAnimalChessState,animalChessAllLegalMoves,animalChessLegalMoves,applyAnimalChessMove,chooseAnimalChessAiMove,ANIMAL_CHESS_PIECES} from '../src/js/games/animal-chess.js';

const read=p=>fs.readFileSync(p,'utf8');
const animal=GAMES.find(g=>g.key==='animal-chess');
const piece=(side,type,r,c)=>({id:`${side}-${type}`,side,type,rank:ANIMAL_CHESS_PIECES[type].rank,r,c});
const state=(turn,pieces,other={})=>({turn,pieces,moves:0,winner:null,draw:false,noCaptureMoves:0,lastMove:null,...other});

test('Animal Chess is an explicitly unranked, non-daily Board experience',()=>{
  assert.ok(animal);
  assert.equal(animal.experienceType,'board');
  assert.equal(animal.category,'Board');
  assert.deepEqual(animal.levels.map(([key])=>key),['local']);
  for(const cap of ['hint','solution','solutionSteps','daily','ranking'])assert.equal(animal.capabilities[cap],false,cap);
  assert.equal(animal.ranking.enabled,false);
  assert.equal(typeof RESULT_VERIFIERS['animal-chess'],'function');
  assert.equal(RESULT_VERIFIERS['animal-chess'](),null);
  assert.equal(verifyAndScoreResult({game:'animal-chess',difficulty:'local',mode:'normal',time_ms:10000,hints_used:0,metadata:{seed:'animal-chess:local:123'}}).ok,false);
});

test('Animal Chess guide gives actual match instructions with no race copy or HTML patch',()=>{
  const guide=getGameGuide(animal),built=read('dist/blog/how-to-play-animal-chess/index.html');
  assert.equal(guide.format.heading,'Match format and winning conditions');
  assert.equal(guide.controls.heading,'Playing locally or against the CPU');
  assert.match(guide.format.body,/Red always moves first/);
  assert.match(guide.format.body,/no Daily Challenge/);
  assert.match(guide.controls.body,/Easy, Smart or Expert/);
  assert.match(guide.difficultyCopy,/seven columns by nine rows/);
  assert.doesNotMatch(JSON.stringify(guide),/distance increases continuously|scrolling camera|no finish line|country selection/i);
  assert.match(built,/Match format and winning conditions/);
  assert.match(built,/Playing locally or against the CPU/);
  assert.match(built,/Rat/);
  assert.doesNotMatch(built,/racer distance|camera keeps the leading pack visible|Hint gives a limited concrete next action/);
  assert.doesNotMatch(JSON.parse(read('package.json')).scripts.build,/animal-chess-guide-fix/);
  assert.equal(fs.existsSync('scripts/animal-chess-guide-fix.mjs'),false);
});

test('Animal Chess page and module use the same immutable CSS release',()=>{
  const page=read('dist/animal-chess/index.html'),manifest=JSON.parse(read('dist/release.json'));
  assert.match(page,/data-game="animal-chess"/);
  assert.ok(page.includes(`${manifest.assetsBase}styles/animal-chess.css`));
  assert.ok(page.includes(`${manifest.assetsBase}js/game-page.js`));
  assert.ok(Object.hasOwn(manifest.assets,'js/games/animal-chess.js'));
  assert.ok(Object.hasOwn(manifest.assets,'js/social-renderers/animal-chess.js'));
  assert.ok(Object.hasOwn(manifest.assets,'styles/animal-chess.css'));
  assert.doesNotMatch(read('src/js/games/animal-chess.js'),/\/assets\/styles\/animal-chess\.css/);
  assert.deepEqual(getGamePresentation(animal).styles,['animal-chess.css']);
});

test('Animal Chess invalid move cannot alter turn, history or piece locations',()=>{
  const initial=createAnimalChessState();
  for(const [id,r,c] of [['blue-rat',3,0],['red-tiger',5,1],['red-elephant',8,3]]){
    assert.strictEqual(applyAnimalChessMove(initial,id,r,c),initial);
  }
  const moved=applyAnimalChessMove(initial,'red-tiger',7,0);
  assert.notEqual(moved,initial);
  assert.equal(initial.moves,0);
  assert.equal(moved.moves,1);
  assert.equal(moved.turn,'blue');
  assert.deepEqual([initial.pieces.find(p=>p.id==='red-tiger').r,initial.pieces.find(p=>p.id==='red-tiger').c],[8,0]);
});

test('Animal Chess draw after 120 non-capturing moves cannot accept extra moves',()=>{
  const match=state('red',[piece('red','cat',6,0),piece('blue','cat',2,6)],{moves:119,noCaptureMoves:119});
  const next=applyAnimalChessMove(match,'red-cat',5,0);
  assert.equal(next.draw,true);
  assert.equal(next.winner,null);
  assert.strictEqual(applyAnimalChessMove(next,'blue-cat',3,6),next);
});

test('Animal Chess AI never generates illegal moves over a short deterministic match',()=>{
  let position=createAnimalChessState();
  for(let i=0;i<18&&!position.winner&&!position.draw;i++){
    const legal=animalChessAllLegalMoves(position);
    assert.ok(legal.length>0);
    const action=chooseAnimalChessAiMove(position,'medium',position.turn);
    assert.ok(action);
    assert.ok(legal.some(move=>move.pieceId===action.pieceId&&move.r===action.r&&move.c===action.c));
    position=applyAnimalChessMove(position,action.pieceId,action.r,action.c);
    assert.equal(position.moves,i+1);
    assert.equal(new Set(position.pieces.map(p=>p.id)).size,position.pieces.length);
    assert.ok(position.pieces.every(p=>p.r>=0&&p.r<9&&p.c>=0&&p.c<7));
  }
});

test('Animal Chess no legal move wins for the opponent rather than starting a new round',()=>{
  const match=state('red',[piece('red','rat',1,3),piece('blue','cat',7,3)]);
  const a=animalChessLegalMoves(match,'red-rat');
  assert.ok(a.length>0);
  const next=applyAnimalChessMove(match,'red-rat',0,3);
  assert.equal(next.winner,'red');
  assert.deepEqual(animalChessAllLegalMoves(next),[]);
});
