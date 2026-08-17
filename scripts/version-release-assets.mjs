import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const assetsRoot=path.join(dist,'assets');
const sourceDirs=['js','styles'];

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
async function copyDir(from,to){
  await fs.mkdir(to,{recursive:true});
  for(const entry of await fs.readdir(from,{withFileTypes:true})){
    const src=path.join(from,entry.name),dest=path.join(to,entry.name);
    if(entry.isDirectory())await copyDir(src,dest);
    else await fs.copyFile(src,dest);
  }
}

const sourceFiles=[];
for(const name of sourceDirs){
  const dir=path.join(assetsRoot,name);
  for(const file of await walk(dir))sourceFiles.push(file);
}
sourceFiles.sort();

const hash=crypto.createHash('sha256');
for(const file of sourceFiles){
  hash.update(path.relative(assetsRoot,file).split(path.sep).join('/'));
  hash.update('\0');
  hash.update(await fs.readFile(file));
  hash.update('\0');
}
const version=hash.digest('hex').slice(0,12);
const versionRoot=path.join(assetsRoot,version);
await fs.rm(versionRoot,{recursive:true,force:true});
for(const name of sourceDirs)await copyDir(path.join(assetsRoot,name),path.join(versionRoot,name));

const rewrite=text=>text
  .replaceAll('/assets/js/',`/assets/${version}/js/`)
  .replaceAll('/assets/styles/',`/assets/${version}/styles/`);

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  const before=await fs.readFile(file,'utf8'),after=rewrite(before);
  if(after!==before)await fs.writeFile(file,after);
}
for(const file of (await walk(path.join(versionRoot,'js'))).filter(file=>file.endsWith('.js'))){
  const before=await fs.readFile(file,'utf8'),after=rewrite(before);
  if(after!==before)await fs.writeFile(file,after);
}

const manifest={version,assetBase:`/assets/${version}`,generatedAt:new Date().toISOString()};
await fs.writeFile(path.join(dist,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');

const headersFile=path.join(dist,'_headers');
let headers='';
try{headers=await fs.readFile(headersFile,'utf8');}catch{}
const immutableRule=`\n/assets/${version}/*\n  Cache-Control: public, max-age=31536000, immutable\n`;
if(!headers.includes(`/assets/${version}/*`))await fs.writeFile(headersFile,headers.replace(/\s*$/,'')+immutableRule);

console.log(`Versioned release assets: ${version}`);
