import {drawFallback} from './social-renderers/shared.js';

const puzzleCache=new Map();
const pluginCache=new Map();

function puzzleSeed(payload){return `social:${payload.date||'today'}:${payload.variant||0}:${payload.game?.key||'game'}`;}
function safeGameKey(value){const key=String(value||'');return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)?key:'';}
function generatorName(key){return `generate${key.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join('')}`;}

async function loadPlugin(key){
  if(pluginCache.has(key))return pluginCache.get(key);
  const task=(async()=>{
    if(!key)return null;
    try{
      const [gameModule,rendererModule]=await Promise.all([
        import(`./games/${key}.js`),
        import(`./social-renderers/${key}.js`).catch(()=>null)
      ]);
      const generator=gameModule?.[generatorName(key)];
      const draw=rendererModule?.drawSocialBoard;
      if(typeof generator!=='function')return null;
      return{generator,draw:typeof draw==='function'?draw:null};
    }catch(error){
      console.warn(`Social plugin ${key} could not be loaded.`,error);
      return null;
    }
  })();
  pluginCache.set(key,task);
  return task;
}

async function generatePuzzle(payload){
  const key=safeGameKey(payload.game?.key),seed=puzzleSeed(payload),cacheKey=`${key}:${seed}`;
  if(puzzleCache.has(cacheKey))return puzzleCache.get(cacheKey);
  const plugin=await loadPlugin(key);
  if(!plugin){puzzleCache.set(cacheKey,null);return null;}
  let puzzle=null;
  for(let attempt=0;attempt<3&&!puzzle;attempt++){
    try{puzzle=plugin.generator('hard',`${seed}:attempt:${attempt}`);}catch(error){console.warn(`Social preview ${key} attempt ${attempt+1} failed.`,error);}
  }
  const result=puzzle?{puzzle,draw:plugin.draw}:null;
  puzzleCache.set(cacheKey,result);return result;
}

export async function drawGameBoard(ctx,payload,box){
  const generated=await generatePuzzle(payload);
  if(!generated){drawFallback(ctx,payload,box);return{generated:false,difficulty:'hard',renderer:'fallback'};}
  if(!generated.draw){drawFallback(ctx,payload,box);return{generated:true,difficulty:generated.puzzle.difficulty||'hard',size:generated.puzzle.size,renderer:'fallback'};}
  generated.draw(ctx,generated.puzzle,box);
  return{generated:true,difficulty:generated.puzzle.difficulty||'hard',size:generated.puzzle.size,renderer:'game'};
}

export function clearSocialBoardCache(){puzzleCache.clear();}
