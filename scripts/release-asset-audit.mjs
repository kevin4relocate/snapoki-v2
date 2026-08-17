import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const failures=[];
const fail=message=>failures.push(message);

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
async function exists(file){try{await fs.access(file);return true;}catch{return false;}}
function containsUnversionedAssetRef(text){return /\/assets\/(?:js|styles)\//.test(text);}

const manifestFile=path.join(dist,'asset-manifest.json');
if(!await exists(manifestFile))fail('asset-manifest.json is missing.');
let manifest=null;
if(await exists(manifestFile)){
  try{manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));}catch{fail('asset-manifest.json is invalid JSON.');}
}
const version=manifest?.version||'';
if(!/^[a-f0-9]{12}$/.test(version))fail(`asset manifest version is invalid: ${version||'(empty)'}`);
const versionRoot=version?path.join(dist,'assets',version):'';
if(version&&!(await exists(path.join(versionRoot,'js'))))fail(`${version}: versioned js directory is missing.`);
if(version&&!(await exists(path.join(versionRoot,'styles'))))fail(`${version}: versioned styles directory is missing.`);

const htmlFiles=(await walk(dist)).filter(file=>file.endsWith('.html'));
for(const file of htmlFiles){
  const text=await fs.readFile(file,'utf8');
  if(containsUnversionedAssetRef(text))fail(`${path.relative(dist,file)}: contains an unversioned JS/CSS asset reference.`);
}

if(version&&await exists(versionRoot)){
  for(const file of (await walk(versionRoot)).filter(file=>/\.(?:js|css)$/.test(file))){
    const text=await fs.readFile(file,'utf8');
    if(containsUnversionedAssetRef(text))fail(`${path.relative(dist,file)}: contains an unversioned absolute asset reference.`);
  }

  const prefix=`/assets/${version}/`;
  let references=0;
  for(const file of htmlFiles){
    const text=await fs.readFile(file,'utf8');
    references+=text.split(prefix).length-1;
  }
  if(!references)fail(`No built HTML references the versioned asset prefix ${prefix}.`);

  const headers=await fs.readFile(path.join(dist,'_headers'),'utf8').catch(()=> '');
  if(!headers.includes(`/assets/${version}/*`))fail(`_headers is missing immutable cache rule for ${version}.`);
  if(!/Cache-Control:\s*public,\s*max-age=31536000,\s*immutable/i.test(headers))fail('_headers is missing the expected immutable cache policy.');
}

if(failures.length){
  console.error(`Release asset audit failed (${failures.length}):`);
  for(const item of failures)console.error(`  - ${item}`);
  process.exit(1);
}
console.log(`Release asset audit passed: ${version} JS/CSS references are versioned and immutable.`);
