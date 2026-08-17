import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const fail=message=>failures.push(message);
const generatorName=slug=>`generate${slug.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join('')}`;
const exists=async file=>{try{await fs.access(file);return true;}catch{return false;}};

const coreFiles=[
  path.join(root,'src','js','admin-content.js'),
  path.join(root,'src','js','social-game-board.js'),
  path.join(root,'functions','_lib','social-content.js')
];
const coreText=(await Promise.all(coreFiles.map(file=>fs.readFile(file,'utf8')))).join('\n');
const loader=await fs.readFile(path.join(root,'src','js','social-game-board.js'),'utf8');
if(!loader.includes('import(`./games/${slug}.js`)'))fail('Content Desk social loader must discover game modules by slug convention.');
if(!loader.includes('import(`./social-renderers/${slug}.js`)'))fail('Content Desk social loader must discover social renderers by slug convention.');
if(!loader.includes('generatorName(slug)'))fail('Content Desk social loader must derive generator export names generically.');

for(const game of GAMES){
  for(const literal of [`'${game.key}'`,`"${game.key}"`,`'${game.slug}'`,`"${game.slug}"`])if(coreText.includes(literal))fail(`${game.key}: Content Desk core contains a game-specific literal; move it into the game plugin/registry.`);

  const engine=path.join(root,'src','js','games',`${game.slug}.js`);
  const renderer=path.join(root,'src','js','social-renderers',`${game.slug}.js`);
  if(!await exists(engine)){fail(`${game.key}: missing game engine plugin ${game.slug}.js`);continue;}
  if(!await exists(renderer)){fail(`${game.key}: missing social renderer plugin ${game.slug}.js`);continue;}

  try{
    const gameModule=await import(`${pathToFileURL(engine).href}?audit=${Date.now()}-${game.key}`);
    const exportName=generatorName(game.slug);
    if(typeof gameModule[exportName]!=='function')fail(`${game.key}: engine must export ${exportName}() for Content Desk auto-discovery.`);
  }catch(error){fail(`${game.key}: engine plugin could not be imported (${error.message}).`);}

  try{
    const rendererModule=await import(`${pathToFileURL(renderer).href}?audit=${Date.now()}-${game.key}`);
    if(typeof rendererModule.drawSocialBoard!=='function')fail(`${game.key}: social renderer must export drawSocialBoard().`);
  }catch(error){fail(`${game.key}: social renderer plugin could not be imported (${error.message}).`);}
}

if(failures.length){
  console.error(`Content Desk plugin audit failed (${failures.length}):`);
  for(const item of failures)console.error(`  - ${item}`);
  process.exit(1);
}
console.log(`Content Desk plugin audit passed: ${GAMES.length} games auto-discover engine and social renderer plugins with no game-specific admin literals.`);
