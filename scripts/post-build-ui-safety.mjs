import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

async function htmlFiles(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await htmlFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);
  }
  return out;
}

for(const file of await htmlFiles(dist)){
  let html=await fs.readFile(file,'utf8');
  html=html.replaceAll('<span class="eyebrow">Same boards for everyone</span>','');
  if(html.includes('class="content-page')&&!html.includes('/assets/styles/content.css')){
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/content.css"></head>');
  }
  if(!html.includes('/assets/styles/ui-safety.css')){
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/ui-safety.css"></head>');
  }
  await fs.writeFile(file,html);
}
