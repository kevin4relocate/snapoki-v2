import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const contractRel='/assets/styles/board-contract.css';
const contractLink=`<link rel="stylesheet" href="${contractRel}">`;

async function htmlFiles(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await htmlFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);
  }
  return out;
}

await fs.access(path.join(dist,'assets','styles','board-contract.css'));

for(const file of await htmlFiles(dist)){
  let html=await fs.readFile(file,'utf8');
  if(!html.includes('id="gameBoard"'))continue;
  if(!html.includes(contractRel))html=html.replace('</head>',`${contractLink}</head>`);
  await fs.writeFile(file,html);
}
