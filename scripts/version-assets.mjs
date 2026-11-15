// Final build step: preserve the JS module graph and CSS under one content-addressed
// release directory, then point HTML at immutable URLs. Stable /assets/js and
// /assets/styles aliases remain revalidated for backwards compatibility.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const base=path.join(dist,'assets');
const directoryNames=['js','styles'];

async function walk(dir){
  const items=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const absolute=path.join(dir,entry.name);
    if(entry.isDirectory())items.push(...await walk(absolute));
    else if(entry.isFile())items.push(absolute);
  }
  return items;
}

const contentFiles=(await Promise.all(directoryNames.map(async name=>walk(path.join(base,name))))).flat();
contentFiles.sort();
if(!contentFiles.length)throw new Error('No JS/CSS assets to fingerprint.');

const hash=createHash('sha256');
const manifestFiles={};
for(const file of contentFiles){
  const key=path.relative(base,file).split(path.sep).join('/');
  const data=await fs.readFile(file);
  const digest=createHash('sha256').update(data).digest('hex');
  manifestFiles[key]={sha256:digest,bytes:data.length};
  hash.update(key);hash.update('\0');hash.update(digest);hash.update('\n');
}
const id=hash.digest('hex').slice(0,20);
const releasePath=path.join(base,'r',id);
for(const name of directoryNames)await fs.cp(path.join(base,name),path.join(releasePath,name),{recursive:true});

let rewritten=0;
for(const file of (await walk(dist)).filter(f=>f.endsWith('.html'))){
  const html=await fs.readFile(file,'utf8');
  const next=html.replace(/\/assets\/(js|styles)\/([a-z0-9_./-]+\.(?:js|css))/gi,(_match,kind,resource)=>{
    if(!Object.hasOwn(manifestFiles,`${kind}/${resource}`))throw new Error(`HTML references missing asset ${kind}/${resource}`);
    rewritten++;
    return `/assets/r/${id}/${kind}/${resource}`;
  });
  if(next!==html)await fs.writeFile(file,next);
}
if(rewritten<10)throw new Error('Expected versioned HTML references across all game pages.');

const commit=process.env.CF_PAGES_COMMIT_SHA||process.env.GITHUB_SHA||process.env.SOURCE_COMMIT||null;
const release={
  schema:1,
  releaseId:id,
  commit:commit&&/^[a-f0-9]{40}$/i.test(commit)?commit:null,
  builtAt:new Date().toISOString(),
  assetsBase:`/assets/r/${id}/`,
  assets:manifestFiles,
  referenceCount:rewritten
};
await fs.writeFile(path.join(dist,'release.json'),JSON.stringify(release,null,2)+'\n');
console.log(`Versioned ${contentFiles.length} JS/CSS assets into /assets/r/${id}/; rewrote ${rewritten} HTML references.`);
