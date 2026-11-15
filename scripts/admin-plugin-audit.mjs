import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {GAMES,EXPERIENCE_TYPES} from '../src/js/games-config.js';

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
  if(!EXPERIENCE_TYPES.includes(game.experienceType))fail(`${game.key}: unsupported experienceType '${game.experienceType}'. Use puzzle, board or simulation.`);
  if(game.experienceType!=='puzzle'&&(game.capabilities?.daily!==false||game.capabilities?.ranking!==false||game.ranking?.enabled!==false))
    fail(`${game.key}: non-puzzle experiences cannot inherit Daily or ranked gameplay.`);
  if(!Array.isArray(game.howTo)||game.howTo.length<3||game.howTo.some(step=>typeof step!=='string'||!step.trim()))
    fail(`${game.key}: provide at least three nonempty gameplay instructions.`);
  if(!Array.isArray(game.levels)||!game.levels.length||game.levels.some(level=>!Array.isArray(level)||level.length!==3||level.some(part=>typeof part!=='string'||!part.trim())))
    fail(`${game.key}: provide at least one complete [key, label, detail] control level.`);
  if(game.guide){
    const guide=game.guide;
    if(typeof guide!=='object'||Array.isArray(guide))fail(`${game.key}: guide override must be an object.`);
    else {
      for(const key of ['focus','difficultyCopy','ctaCopy'])if(guide[key]!==undefined&&(typeof guide[key]!=='string'||!guide[key].trim()))
        fail(`${game.key}: guide.${key} must be nonempty text.`);
      for(const key of ['tips','mistakes'])if(guide[key]!==undefined&&(!Array.isArray(guide[key])||guide[key].length<2||guide[key].some(text=>typeof text!=='string'||!text.trim())))
        fail(`${game.key}: guide.${key} must contain at least two nonempty entries.`);
      for(const key of ['controls','format'])if(guide[key]!==undefined&&(!guide[key]||typeof guide[key].heading!=='string'||!guide[key].heading.trim()||typeof guide[key].body!=='string'||!guide[key].body.trim()))
        fail(`${game.key}: guide.${key} requires heading and body strings.`);
    }
  }


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
