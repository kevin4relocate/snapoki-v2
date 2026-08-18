import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBridges} from '../src/js/games/bridges-core.js';
import {verifyAndScoreResult} from '../functions/_lib/scoring.js';

function proofFor(difficulty,seed){
  const puzzle=generateBridges(difficulty,seed),actions=[];
  for(let edgeIndex=0;edgeIndex<puzzle.solution.length;edgeIndex++)for(let value=1;value<=puzzle.solution[edgeIndex];value++)actions.push(`${edgeIndex}:${value}`);
  return{puzzle,actions,metadata:{seed,size:puzzle.size,islands:puzzle.islands.length,candidate_edges:puzzle.edges.length,links:puzzle.solution.filter(Boolean).length,moves:actions.length,ideal_moves:puzzle.solution.reduce((sum,value)=>sum+value,0),bridges:[...puzzle.solution],actions}};
}

test('server replays a legitimate Bridges action trace',()=>{const{metadata}=proofFor('easy','bridges:easy:v2:verifier');const result=verifyAndScoreResult({game:'bridges',difficulty:'easy',mode:'normal',time_ms:60000,hints_used:0,metadata});assert.equal(result.ok,true);assert.equal(result.metadata.moves,metadata.actions.length);});
test('server rejects client move counts that do not match the replay trace',()=>{const{metadata}=proofFor('medium','bridges:medium:v2:move-tamper');const result=verifyAndScoreResult({game:'bridges',difficulty:'medium',mode:'normal',time_ms:90000,hints_used:0,metadata:{...metadata,moves:0}});assert.equal(result.ok,false);});
test('server rejects a final network that cannot be reproduced by the submitted actions',()=>{const{metadata}=proofFor('hard','bridges:hard:v2:trace-tamper'),actions=metadata.actions.slice(0,-1);const result=verifyAndScoreResult({game:'bridges',difficulty:'hard',mode:'normal',time_ms:120000,hints_used:0,metadata:{...metadata,actions,moves:actions.length}});assert.equal(result.ok,false);});
