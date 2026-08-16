import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const referencePages=new Set(['how-to-play/index.html','daily-challenges/index.html','rankings-guide/index.html']);
const contentLink='<link rel="stylesheet" href="/assets/styles/content.css">';
const launchLink='<link rel="stylesheet" href="/assets/styles/launch.css">';

async function htmlFiles(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await htmlFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);
  }
  return out;
}

function ensureContentStyleOrder(html){
  if(!html.includes('class="content-page'))return html;
  if(!html.includes(contentLink)){
    return html.includes(launchLink)?html.replace(launchLink,contentLink+launchLink):html.replace('</head>',contentLink+'</head>');
  }
  if(html.includes(launchLink)&&html.indexOf(contentLink)>html.indexOf(launchLink)){
    html=html.replace(contentLink,'');
    html=html.replace(launchLink,contentLink+launchLink);
  }
  return html;
}

for(const file of await htmlFiles(dist)){
  let html=await fs.readFile(file,'utf8');
  const rel=path.relative(dist,file).split(path.sep).join('/');
  html=html.replaceAll('<span class="eyebrow">Same boards for everyone</span>','');
  if(referencePages.has(rel)&&html.includes('class="content-page"'))html=html.replace('class="content-page"','class="content-page reference-page"');
  html=ensureContentStyleOrder(html);
  if(!html.includes('/assets/styles/ui-safety.css')){
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/ui-safety.css"></head>');
  }
  await fs.writeFile(file,html);
}
