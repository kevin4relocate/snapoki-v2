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
  path.join(root,'public','snapdesk-74kq','index.html'),
  path.join(root,'src','js','admin-content.js'),
  path.join(root,'src','js','social-game-board.js'),
  path.join(root,'functions','api','snapdesk-74kq','content.js'),
  path.join(root,'functions','_lib','social-content.js')
];
const coreText=(await Promise.all(coreFiles.map(file=>fs.readFile(file,'utf8')))).join('\n');
const loader=await fs.readFile(path.join(root,'src','js','social-game-board.js'),'utf8');
if(!loader.includes('import(`./games/${slug}.js`)'))fail('Content Desk social loader must discover game modules by slug convention.');
if(!loader.includes('import(`./social-renderers/${slug}.js`)'))fail('Content Desk social loader must discover social renderers by slug convention.');
if(!loader.includes('generatorName(slug)'))fail('Content Desk social loader must derive generator export names generically.');

const keys=new Set(),slugs=new Set();
for(const game of GAMES){
  if(keys.has(game.key))fail(`${game.key}: duplicate Game Registry key.`);else keys.add(game.key);
  if(slugs.has(game.slug))fail(`${game.slug}: duplicate Game Registry slug.`);else slugs.add(game.slug);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.key))fail(`${game.key}: game key must use lowercase kebab-case.`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug))fail(`${game.slug}: game slug must use lowercase kebab-case.`);

  for(const literal of [`'${game.key}'`,`"${game.key}"`,`'${game.slug}'`,`"${game.slug}"`])if(coreText.includes(literal))fail(`${game.key}: Content Desk core contains a game-specific literal; move it into the game plugin/registry.`);

  const engine=path.join(root,'src','js','games',`${game.slug}.js`);
  const renderer=path.join(root,'src','js','social-renderers',`${game.slug}.js`);
  if(!await exists(engine)){fail(`${game.key}: missing stable game entry ${game.slug}.js`);continue;}
  if(!await exists(renderer)){fail(`${game.key}: missing social renderer plugin ${game.slug}.js`);continue;}

  try{
    const gameModule=await import(`${pathToFileURL(engine).href}?audit=${Date.now()}-${game.key}`);
    const exportName=generatorName(game.slug);
    if(typeof gameModule.createGame!=='function')fail(`${game.key}: stable game entry must export createGame().`);
    if(typeof gameModule[exportName]!=='function')fail(`${game.key}: stable game entry must export ${exportName}() for deterministic generation and Content Desk auto-discovery.`);
  }catch(error){fail(`${game.key}: game plugin could not be imported (${error.message}).`);}

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
console.log(`Content Desk plugin audit passed: ${GAMES.length} unique games expose stable engine/generator entries and social renderers with no game-specific admin literals.`);
