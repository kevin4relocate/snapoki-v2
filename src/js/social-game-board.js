import {drawFallback} from './social-renderers/shared.js';

const puzzleCache=new Map();
const pluginCache=new Map();

function puzzleSeed(payload){return `social:${payload.date||'today'}:${payload.variant||0}:${payload.game?.key||payload.game?.slug||'game'}`;}
function safePluginSlug(value){const slug=String(value||'');return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)?slug:'';}
function generatorName(slug){return `generate${slug.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join('')}`;}

async function loadPlugin(slug){
  if(pluginCache.has(slug))return pluginCache.get(slug);
  const task=(async()=>{
    if(!slug)return null;
    try{
      const [gameModule,rendererModule]=await Promise.all([
        import(`./games/${slug}.js`),
        import(`./social-renderers/${slug}.js`).catch(()=>null)
      ]);
      const generator=gameModule?.[generatorName(slug)];
      const draw=rendererModule?.drawSocialBoard;
      if(typeof generator!=='function')return null;
      return{generator,draw:typeof draw==='function'?draw:null};
    }catch(error){
      console.warn(`Social plugin ${slug} could not be loaded.`,error);
      return null;
    }
  })();
  pluginCache.set(slug,task);
  return task;
}

async function generatePuzzle(payload){
  const slug=safePluginSlug(payload.game?.slug||payload.game?.key),identity=payload.game?.key||slug,seed=puzzleSeed(payload),cacheKey=`${identity}:${seed}`;
  if(puzzleCache.has(cacheKey))return puzzleCache.get(cacheKey);
  const plugin=await loadPlugin(slug);
  if(!plugin){puzzleCache.set(cacheKey,null);return null;}
  let puzzle=null;
  for(let attempt=0;attempt<3&&!puzzle;attempt++){
    try{puzzle=plugin.generator('hard',`${seed}:attempt:${attempt}`);}catch(error){console.warn(`Social preview ${identity} attempt ${attempt+1} failed.`,error);}
  }
  const result=puzzle?{puzzle,draw:plugin.draw,identity}:null;
  puzzleCache.set(cacheKey,result);return result;
}

export async function drawGameBoard(ctx,payload,box){
  const generated=await generatePuzzle(payload);
  if(!generated){drawFallback(ctx,payload,box);return{generated:false,difficulty:'hard',renderer:'fallback'};}
  if(!generated.draw){drawFallback(ctx,payload,box);return{generated:true,difficulty:generated.puzzle.difficulty||'hard',size:generated.puzzle.size,renderer:'fallback'};}
  try{
    generated.draw(ctx,generated.puzzle,box);
    return{generated:true,difficulty:generated.puzzle.difficulty||'hard',size:generated.puzzle.size,renderer:'game'};
  }catch(error){
    console.warn(`Social renderer ${generated.identity||'game'} failed; using fallback artwork.`,error);
    drawFallback(ctx,payload,box);
    return{generated:true,difficulty:generated.puzzle.difficulty||'hard',size:generated.puzzle.size,renderer:'fallback-error'};
  }
}

export function clearSocialBoardCache(){puzzleCache.clear();}
