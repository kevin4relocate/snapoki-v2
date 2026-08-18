import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const ROOTS=['src/js','functions','scripts','tests'];
const EXTENSIONS=new Set(['.js','.mjs']);

async function collectFiles(directory){
  const entries=await readdir(directory,{withFileTypes:true}),files=[];
  for(const entry of entries){
    const target=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...await collectFiles(target));
    else if(EXTENSIONS.has(path.extname(entry.name)))files.push(target);
  }
  return files;
}

const files=(await Promise.all(ROOTS.map(collectFiles))).flat().sort();
let failures=0;
for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status===0)continue;
  failures++;
  process.stderr.write(`\nSyntax check failed: ${file}\n${result.stderr||result.stdout||''}`);
}

if(failures){
  process.stderr.write(`\n${failures} JavaScript syntax check${failures===1?'':'s'} failed.\n`);
  process.exit(1);
}
console.log(`Syntax check passed: ${files.length} JavaScript modules.`);
