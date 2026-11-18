// Read-only production verification. No Cloudflare credentials or data writes.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
function option(name){
  const i=args.indexOf(name);
  return i<0?null:args[i+1]||null;
}
if(args.includes('--help')){
  console.log('Usage: npm run verify:production -- [--url https://snapoki.com] [--expected-release <20-hex>] [--expected-commit <40-hex>]');
  process.exit(0);
}
const raw=option('--url')||'https://snapoki.com';
const target=new URL(raw);
if(target.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('Production verification requires HTTPS.');
const base=target.origin;
const expectedRelease=option('--expected-release');
const expectedCommit=option('--expected-commit');
if(expectedRelease&&!/^[a-f0-9]{20}$/.test(expectedRelease))throw new Error('Invalid --expected-release');
if(expectedCommit&&!/^[a-f0-9]{40}$/i.test(expectedCommit))throw new Error('Invalid --expected-commit');
const hash=b=>createHash('sha256').update(b).digest('hex');
const get=async route=>{
  const response=await fetch(new URL(route,base),{headers:{'cache-control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(15000),redirect:'follow'});
  return response;
};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
async function verify(){
  const manifestRes=await get('/release.json?verify='+Date.now());
  assert(manifestRes.status===200,'release.json missing (HTTP '+manifestRes.status+'). Production likely uses an old/wrong Cloudflare Pages deployment; GitHub CI alone does not publish the site.');
  const release=await manifestRes.json();
  assert(/^[a-f0-9]{20}$/.test(release.releaseId||''),'Invalid or missing release fingerprint');
  assert(release.assetsBase===`/assets/r/${release.releaseId}/`,'Invalid versioned asset base');
  assert(release.assets&&typeof release.assets==='object','Missing public asset manifest');
  if(expectedRelease)assert(release.releaseId===expectedRelease,`Stale deployment: expected asset release ${expectedRelease}, live ${release.releaseId}`);
  if(expectedCommit)assert(release.commit===expectedCommit,`Stale deployment: expected commit ${expectedCommit}, live ${release.commit||'unavailable'}`);
  console.log(`Release: ${release.releaseId}; commit: ${release.commit||'(unknown)'}; built: ${release.builtAt}`);

  // Each Loop route must be on the same versioned release, not merely return 200.
  const loops=[
    {slug:'world-loop',entry:'js/games/world-loop.js',style:'styles/world-loop.css',dependencies:['js/endless-race/engine.js','js/endless-race/themes/flag.js']},
    {slug:'animal-loop',entry:'js/games/animal-loop.js',style:'styles/world-loop.css',dependencies:['styles/animal-loop.css','js/endless-race/engine.js','js/endless-race/themes/animal.js']},
    {slug:'aquarium-loop',entry:'js/games/aquarium-loop.js',style:'styles/aquarium-loop.css',dependencies:['js/ambient/engine.js','js/ambient/swim.js','js/ambient/themes/aquarium.js']}
  ];
  const pages=['/','/echo-step/','/maze/','/bridges/',...loops.map(loop=>'/'+loop.slug+'/'),'/snapdesk-74kq/'];
  for(const route of pages){
    const result=await get(route);
    assert(result.status===200,`${route}: HTTP ${result.status}`);
    const html=await result.text();
    assert(html.includes(release.assetsBase),`${route}: HTML does not point to current release assets`);
    assert(!/\/assets\/(?:js|styles)\/[a-z0-9/_-]+\.(?:js|css)/i.test(html),`${route}: unversioned HTML asset URL`);
    if(route==='/snapdesk-74kq/')assert(/noindex,nofollow,noarchive/.test(html),'Content Desk noindex is missing');
    const loop=loops.find(loop=>route==='/'+loop.slug+'/');
    if(loop){
      assert(html.includes('data-game="'+loop.slug+'"'),loop.slug+': route serves the wrong game HTML');
      assert(html.includes(release.assetsBase+loop.style),loop.slug+': versioned CSS missing');
      assert(html.includes(release.assetsBase+'styles/loop-toolbar.css'),loop.slug+': shared Loop toolbar stylesheet missing');
      if(loop.slug==='animal-loop')assert(html.includes(release.assetsBase+'styles/animal-loop.css'),'Animal Loop theme CSS missing');
      assert(html.includes(release.assetsBase+'js/game-page.js'),loop.slug+': versioned game bootstrap missing');
    }
    console.log(`PASS ${route}: release URLs present`);
  }
  const verifiedAssets=new Set([
    'js/site.js','js/game-page.js','js/admin-content.js','styles/site.css','styles/launch.css','styles/loop-toolbar.css',
    ...loops.flatMap(loop=>[loop.entry,loop.style,...loop.dependencies,'js/social-renderers/'+loop.slug+'.js'])
  ]);
  for(const name of verifiedAssets){
    const entry=release.assets[name];
    assert(entry&&/^[a-f0-9]{64}$/.test(entry.sha256),`Missing manifest digest for ${name}`);
    const result=await get(release.assetsBase+name);
    assert(result.status===200,`${name}: HTTP ${result.status}`);
    const bytes=Buffer.from(await result.arrayBuffer());
    assert(hash(bytes)===entry.sha256,`${name}: byte hash mismatch, likely a stale CDN asset`);
    console.log(`PASS ${name}: HTTP 200, digest verified`);
  }
  for(const loop of loops){
    const guide='/blog/how-to-play-'+loop.slug+'/';
    const page=await get(guide);
    assert(page.status===200,guide+': guide missing (HTTP '+page.status+')');
    const html=await page.text();
    assert(html.includes(release.assetsBase),guide+': guide uses a stale asset release');
    console.log('PASS '+guide+': guide on the current release');
  }
  for(const [route,status] of [['/api/profile',410],['/api/global-rankings',410],['/api/runs/start',410],['/api/unknown-release-probe',404]]){
    const response=await get(route);
    assert(response.status===status,`${route}: expected HTTP ${status}, got ${response.status}`);
    console.log(`PASS ${route}: HTTP ${status}`);
  }
  const audio=await fetch(new URL('/audio/world-loop/endless-circuit.mp3',base),{method:'HEAD',signal:AbortSignal.timeout(15000),redirect:'follow'});
  assert(audio.status===200,'World Loop music is missing on production: HTTP '+audio.status);
  console.log('PASS World Loop audio: HTTP 200.');
  const config=await get('/api/config');
  assert(config.status===200,'Guest-only config API not reachable');
  assert((await config.json()).accountsEnabled===false,'Public accounts unexpectedly enabled');
  console.log('PASS guest-only account config.');
  console.log('Production release verification passed. (Does not verify private D1 or authenticated admin operations.)');
}
verify().catch(error=>{console.error('Production verification FAILED:',error.message);process.exitCode=1;});
