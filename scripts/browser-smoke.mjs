import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {GAMES} from '../src/js/games-config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg'};
const server=createServer(async(request,response)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400).end();return;}
  const candidate=path.resolve(root,'.'+pathname);
  if(candidate!==root&&!candidate.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  try{
    const target=(await stat(candidate)).isDirectory()?path.join(candidate,'index.html'):candidate;
    const content=await readFile(target);
    response.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});
    response.end(content);
  }catch{response.writeHead(404).end('Not found');}
});

const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
await listen();
const port=server.address().port;
let browser;
const failures=[];
try{
  browser=await chromium.launch({headless:true});
  for(const game of GAMES){
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    try{
      await page.goto(`http://127.0.0.1:${port}/${game.slug}/`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#gameBoard')?.children.length>0,{timeout:30000});
      await page.waitForFunction(()=>!document.querySelector('#gameBoard')?.hasAttribute('aria-busy'),{timeout:30000});
      const status=await page.locator('#gameStatus').textContent();
      if(status?.includes('could not start'))throw new Error(status);
      if(pageErrors.length)throw new Error(pageErrors.join('; '));
      if(game.capabilities?.daily!==false){
        const easy=page.locator('.difficulty-button[data-difficulty="easy"]');
        if(!(await easy.isVisible()))throw new Error('Missing puzzle difficulty controls');
        await page.locator('#newPuzzle').click();
        await page.waitForFunction(()=>!document.querySelector('#gameBoard')?.hasAttribute('aria-busy'),{timeout:30000});
        if(pageErrors.length)throw new Error(pageErrors.join('; '));
      }
      console.log(`PASS ${game.slug}: board rendered and controls initialized`);
    }catch(error){
      failures.push(`${game.slug}: ${error.stack||error.message}`);
      console.error(`FAIL ${game.slug}: ${error.message}`);
    }finally{await page.close();}
  }
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
if(failures.length){console.error(failures.join('\n\n'));process.exitCode=1;}
