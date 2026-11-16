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

async function verifyMobileLayout(page,game){
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    const metrics=await page.evaluate(()=>({
      scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
      width:document.documentElement.clientWidth
    }));
    if(metrics.scroll>metrics.width+2)throw new Error(`${width}px mobile horizontal overflow: ${metrics.scroll}px scroll vs ${metrics.width}px viewport`);
    const menu=page.locator('#mobileMenuToggle');
    if(!(await menu.isVisible()))throw new Error(`${width}px mobile navigation toggle not visible`);
    if(width===390){
      await menu.focus();
      await page.keyboard.press('Enter');
      if(await menu.getAttribute('aria-expanded')!=='true')throw new Error('Mobile menu not keyboard-operable');
      await page.keyboard.press('Escape');
      if(await menu.getAttribute('aria-expanded')!=='false')throw new Error('Escape does not close mobile menu');
      const focused=await page.evaluate(()=>document.activeElement?.id);
      if(focused!=='mobileMenuToggle')throw new Error('Mobile menu did not restore keyboard focus');
    }
    if(game.capabilities?.daily!==false&&!(await page.locator('#newPuzzle').isVisible()))throw new Error('Puzzle controls hidden on mobile');
  }
}
async function verifyAnimalChess(page){
  const board=page.locator('#animalChessBoard');
  if(await board.locator('.animal-chess-cell').count()!==63)throw new Error('Animal Chess must render a 7x9 board');
  const releaseCss=await page.locator('link[href*="/assets/r/"][href$="/styles/animal-chess.css"]').count();
  if(!releaseCss)throw new Error('Animal Chess stylesheet is missing from the fingerprinted release');
  if(await page.locator('link[href="/assets/styles/animal-chess.css"]').count())throw new Error('Unversioned Animal Chess stylesheet detected');
  const tiger=board.locator('[data-row="8"][data-col="0"]'),advance=()=>board.locator('[data-row="7"][data-col="0"]');
  await tiger.click();
  await advance().click();
  if(await board.locator('[data-row="7"][data-col="0"] .animal-chess-piece.red').count()!==1)throw new Error('Local 2P did not move red Tiger');
  if(await page.locator('#animalChessHistory .animal-chess-movechip').count()!==1)throw new Error('Local 2P move history was not updated');
  await page.locator('#animalChessUndo').click();
  if(await board.locator('[data-row="8"][data-col="0"] .animal-chess-piece.red').count()!==1)throw new Error('Undo did not restore starting Tiger square');
  await tiger.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  if(await board.locator('[data-row="7"][data-col="0"] .animal-chess-piece.red').count()!==1)throw new Error('Keyboard arrows/Enter cannot move a piece');
  await page.locator('#animalChessRestart').click();
  if(await board.locator('[data-row="8"][data-col="0"] .animal-chess-piece.red').count()!==1)throw new Error('New Game did not reset board');
  await page.locator('.animal-chess-segment [data-mode="cpu"]').click();
  await page.locator('#animalChessCpuSelect').selectOption('easy');
  await tiger.click();
  await advance().click();
  await page.waitForFunction(()=>document.querySelectorAll('#animalChessHistory .animal-chess-movechip').length>=2,null,{timeout:12000});
  if(await page.locator('#animalChessHistory .animal-chess-movechip').count()<2)throw new Error('CPU failed to make its reply');
  await page.locator('#animalChessUndo').click();
  if(await board.locator('[data-row="8"][data-col="0"] .animal-chess-piece.red').count()!==1)throw new Error('CPU Undo did not restore human turn');
  const status=await page.locator('#animalChessStatus').textContent();
  if(!status?.includes('Red'))throw new Error('CPU Undo did not restore Red turn');
  console.log('PASS animal-chess: local play, Undo, keyboard, CPU reply, reset, versioned CSS');
}
async function verifyWorldLoopAnimation(page){
  const restored=await page.locator('#worldLoopSelected .world-loop-selected-chip').count();
  if(restored!==8)throw new Error('World Loop did not recover its default eight racers after malformed saved settings');
  await page.evaluate(()=>{
    const native=window.requestAnimationFrame.bind(window);
    window.__wlRafCalls=0;
    window.requestAnimationFrame=callback=>{window.__wlRafCalls++;return native(callback);};
  });
  const count=()=>page.evaluate(()=>window.__wlRafCalls);
  const idle=await count();
  await page.waitForTimeout(160);
  if(await count()>idle+1)throw new Error('World Loop keeps requesting animation frames during setup');
  await page.locator('#worldLoopStart').click();
  await page.waitForTimeout(240);
  if(await count()<idle+4)throw new Error('World Loop did not start its animation');
  await page.locator('#worldLoopPause').click();
  await page.waitForTimeout(80);
  const paused=await count();
  const elapsedPaused=await page.locator('#worldLoopSession').textContent();
  await page.waitForTimeout(210);
  if(await count()>paused+1)throw new Error('World Loop RAF continues while paused');
  if(await page.locator('#worldLoopSession').textContent()!==elapsedPaused)throw new Error('World Loop time advanced while paused');
  await page.locator('#worldLoopPause').click();
  const beforeResume=await count();
  await page.waitForTimeout(200);
  if(await count()<=beforeResume+2)throw new Error('World Loop did not resume animation');
  await page.locator('#worldLoopChange').click();
  await page.waitForTimeout(70);
  const stopped=await count();
  await page.waitForTimeout(160);
  if(await count()>stopped+1)throw new Error('World Loop RAF continues after Stop');
  const add=page.locator('#worldLoopAddCountry');
  await add.focus();
  await page.keyboard.press('Enter');
  if(await add.getAttribute('aria-expanded')!=='true')throw new Error('Country picker not accessible by keyboard');
  await page.keyboard.press('Escape');
  if(await add.getAttribute('aria-expanded')!=='false')throw new Error('Escape did not close country picker');
  if(await page.evaluate(()=>document.activeElement?.id)!=='worldLoopAddCountry')throw new Error('Country picker focus not restored');
}
try{
  browser=await chromium.launch({headless:true});
  for(const game of GAMES){
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    // A valid JSON value that is not an array must never crash World Loop.
    if(game.key==='world-loop')await page.addInitScript(()=>{
      try{localStorage.setItem('snapoki:world-loop:roster:v1','{"corrupted":true}');}catch{}
    });
    try{
      if(game.key==='world-loop'){
        const res=await page.request.get(`http://127.0.0.1:${port}/world-loop/index.html`);
        if(res.status()!==200)throw new Error('Static World Loop index.html route not served from dist');
        const guide=await page.request.get(`http://127.0.0.1:${port}/blog/how-to-play-world-loop/`);
        if(guide.status()!==200)throw new Error('World Loop guide missing from built output');
      }
      await page.goto(`http://127.0.0.1:${port}/${game.slug}/`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#gameBoard')?.children.length>0 || document.querySelector('#gameStatus')?.textContent?.includes('could not start'),null,{timeout:12000}).catch(async error=>{
        const status=await page.locator('#gameStatus').textContent();
        throw new Error(`Board did not render: ${status}; pageErrors: ${pageErrors.join('; ')||'none'}; ${error.message}`);
      });
      await page.waitForFunction(()=>!document.querySelector('#gameBoard')?.hasAttribute('aria-busy'),null,{timeout:12000});
      const status=await page.locator('#gameStatus').textContent();
      if(status?.includes('could not start'))throw new Error(`Engine startup failed: ${status}; pageErrors: ${pageErrors.join('; ')||'none'}`);
      if(pageErrors.length)throw new Error(pageErrors.join('; '));
      if(game.capabilities?.daily!==false){
        const easy=page.locator('.difficulty-button[data-difficulty="easy"]');
        if(!(await easy.isVisible()))throw new Error('Missing puzzle difficulty controls');
        await page.locator('#newPuzzle').click();
        await page.waitForFunction(()=>!document.querySelector('#gameBoard')?.hasAttribute('aria-busy'),null,{timeout:12000});
        if(pageErrors.length)throw new Error(pageErrors.join('; '));
      }
      if(game.key==='animal-chess')await verifyAnimalChess(page);
      if(game.key==='world-loop')await verifyWorldLoopAnimation(page);
      await verifyMobileLayout(page,game);
      if(pageErrors.length)throw new Error(pageErrors.join('; '));
      console.log(`PASS ${game.slug}: desktop, mobile 390/320px, keyboard, animation lifecycle`);
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
