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
    if(game.key==='world-loop'){
      await page.locator('#worldLoopChange').click();
      const picker=await page.evaluate(()=>{
        const card=document.querySelector('.world-loop-setup-card').getBoundingClientRect();
        const setup=document.querySelector('.world-loop-setup').getBoundingClientRect();
        const chip=document.querySelector('.world-loop-selected-chip').getBoundingClientRect();
        const picker=document.querySelector('.world-loop-country-trigger').getBoundingClientRect();
        return {left:card.left,right:card.right,setupLeft:setup.left,setupRight:setup.right,
          chipHeight:chip.height,pickerHeight:picker.height};
      });
      if(picker.left<picker.setupLeft-1||picker.right>picker.setupRight+1||
         picker.chipHeight<44||picker.pickerHeight<44)
        throw new Error(`${width}px country setup overflows or has cramped controls: ${JSON.stringify(picker)}`);
      const country=page.locator('#worldLoopAddCountry');
      await country.click();
      const menuBounds=await page.locator('#worldLoopCountryMenu').boundingBox();
      if(!menuBounds||menuBounds.width<220||menuBounds.x<0||
         menuBounds.x+menuBounds.width>width+2)
        throw new Error(`${width}px country menu clipped horizontally: ${JSON.stringify(menuBounds)}`);
      await page.keyboard.press('Escape');
      await page.locator('#worldLoopStart').click();
      const align=await page.evaluate(()=>({
        raceLeft:document.querySelector('.world-loop-panel').getBoundingClientRect().left,
        headerLeft:document.querySelector('.site-header-inner').getBoundingClientRect().left+
          parseFloat(getComputedStyle(document.querySelector('.site-header-inner')).paddingLeft)
      }));
      if(Math.abs(align.raceLeft-align.headerLeft)>1)
        throw new Error(`${width}px screensaver is not aligned with the header gutter`);
    }
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
  if(restored!==8)throw new Error('World Loop must recover its default eight racers');
  if(await page.locator('.left-panel,.right-panel,.game-howto').count())throw new Error('Screensaver still has puzzle side panels');
  const layout=await page.locator('.world-loop-layout').boundingBox();
  if(!layout||layout.width<page.viewportSize().width*.90)throw new Error('World Loop race canvas did not expand to page width');
  if(await page.locator('#worldLoopSetup').isVisible())throw new Error('Ambient race should auto-start with default countries');
  if(await page.locator('#worldLoopLanes .world-loop-lane').count()!==8)throw new Error('Auto-start race has wrong racer count');
  // The pace and session actions must share one layout group.
  const group=await page.evaluate(()=>{
    const parent=document.querySelector('#worldLoopPace')?.parentElement;
    return parent?.classList.contains('world-loop-session-controls')&&
      ['worldLoopPause','worldLoopRestart','worldLoopChange'].every(id=>parent.contains(document.getElementById(id)));
  });
  if(!group)throw new Error('Pace buttons are not grouped with Pause/Restart/Stop');

  // Changing leader flags/metres must never resize the scoreboard or recreate
  // ranking cards on every HUD tick.
  const order=page.locator('#worldLoopOrder li');
  if(await order.count()!==6)throw new Error('Expected five stable ranking cards and More');
  if(await page.locator('#worldLoopOrder').getAttribute('aria-label')!=='Top five countries')throw new Error('Top 5 label missing for assistive technology');
  const ranks=await page.locator('#worldLoopOrder li:not(.more) b').allTextContents();
  if(ranks.join(',')!=='1,2,3,4,5')throw new Error('CURRENT ORDER does not show ranks one through five: '+ranks.join(','));
  if(await page.locator('#worldLoopOrder li.more strong').textContent()!=='+3')
    throw new Error('Eight racers must show five ranks plus three more');
  // All five rankings and the remainder badge should fit without a horizontal
  // ranking scrollbar on the standard desktop width; mobile may scroll.
  const fit=await page.evaluate(()=>{
    const container=document.getElementById('worldLoopOrder');
    return {client:container.clientWidth,scroll:container.scrollWidth};
  });
  if(fit.scroll>fit.client+2)throw new Error('Top 5 does not fit the desktop race width: '+JSON.stringify(fit));
    await page.evaluate(()=>{window.__wlOrderNodes=[...document.querySelectorAll('#worldLoopOrder li')];});
  await page.waitForTimeout(350);
  const unchanged=await page.evaluate(()=>window.__wlOrderNodes.every((node,i)=>node===document.querySelectorAll('#worldLoopOrder li')[i]));
  if(!unchanged)throw new Error('World Loop recreated ranking cards between HUD updates');
  const sizes=await page.evaluate(()=>{
    const list=document.querySelector('#worldLoopOrder'),li=list.children[0];
    const label=document.querySelector('.world-loop-order-label');
    const cardBefore=li.getBoundingClientRect(),labelBefore=label.getBoundingClientRect();
    li.children[1].textContent='🇬🇧';
    li.children[2].textContent='GB';
    li.children[3].textContent='9,999,999 m';
    document.getElementById('worldLoopLeaderLabel').textContent='🇬🇧 GB LEADS';
    const cardAfter=li.getBoundingClientRect(),labelAfter=label.getBoundingClientRect();
    return {
      cardWidthDiff:cardAfter.width-cardBefore.width,
      labelWidthDiff:labelAfter.width-labelBefore.width,
      cardLeftDiff:cardAfter.left-cardBefore.left,
      cardHeightDiff:cardAfter.height-cardBefore.height
    };
  });
  if(Object.values(sizes).some(x=>Math.abs(x)>1))throw new Error('Scoreboard shifts when flag or metres change: '+JSON.stringify(sizes));

  const pace=page.locator('#worldLoopPace [data-pace]');
  if(await pace.count()!==3)throw new Error('Missing live pace switch');
  const speed=key=>page.locator('#worldLoopPace [data-pace="'+key+'"]');
  if(await speed('easy').getAttribute('aria-pressed')!=='true')throw new Error('Cruise should be initially selected');
  await page.evaluate(()=>{
    const native=window.requestAnimationFrame.bind(window);
    window.__wlRafCalls=0;
    window.requestAnimationFrame=callback=>{window.__wlRafCalls++;return native(callback);};
  });
  const count=()=>page.evaluate(()=>window.__wlRafCalls);
  const running=await count();
  await page.waitForFunction(initial=>window.__wlRafCalls>initial+2,running,{timeout:4000});
  const distance=async()=>Number.parseFloat((await page.locator('#worldLoopLeaderMeta').textContent()).replace(/,/g,''))||0;
  await page.waitForTimeout(1100);
  const before=await distance();
  const sessionBefore=await page.locator('#worldLoopSession').textContent();
  await speed('hard').click();
  if(await speed('hard').getAttribute('aria-pressed')!=='true')throw new Error('Sprint does not activate immediately');
  await page.waitForTimeout(500);
  const after=await distance();
  if(after<before+5)throw new Error('Switching to Sprint stopped or reset distance accumulation');
  if(await page.locator('#worldLoopSession').textContent()==='00:00')throw new Error('Changing pace reset the session timer');
  await speed('medium').click();
  if(await speed('medium').getAttribute('aria-pressed')!=='true')throw new Error('Dynamic did not activate instantly');
  await speed('easy').click();
  if(await speed('easy').getAttribute('aria-pressed')!=='true')throw new Error('Cruise did not activate instantly');

  const sound=page.locator('#worldLoopSoundToggle');
  const soundBefore=await sound.boundingBox();
  if(await sound.textContent()!=='♪ Play Sound')throw new Error('Unexpected initial sound label');
  await sound.click();
  await page.waitForFunction(()=>document.querySelector('#worldLoopSoundToggle')?.getAttribute('aria-pressed')==='true',null,{timeout:12000});
  const soundDuring=await sound.boundingBox();
  if(await sound.textContent()!=='♪ Play Sound'||Math.abs(soundDuring.x-soundBefore.x)>1||
     Math.abs(soundDuring.width-soundBefore.width)>1)throw new Error('Play Sound moved or changed size while playing');
  const mute=page.locator('#worldLoopSoundMute');
  await mute.click();
  if(await mute.getAttribute('aria-pressed')!=='true')throw new Error('Mute did not apply immediately');
  await page.locator('#worldLoopVolume').evaluate(el=>{el.value='18';el.dispatchEvent(new Event('input',{bubbles:true}));});
  if(await page.locator('#worldLoopVolumeValue').textContent()!=='18%')throw new Error('Sound volume did not update live');
  await sound.click();
  await page.waitForFunction(()=>document.querySelector('#worldLoopSoundToggle')?.getAttribute('aria-pressed')==='false');
  const soundAfter=await sound.boundingBox();
  if(await sound.textContent()!=='♪ Play Sound'||Math.abs(soundAfter.x-soundBefore.x)>1||
     Math.abs(soundAfter.width-soundBefore.width)>1)throw new Error('Play Sound moved or changed size after pausing');
  if(await distance()<after)throw new Error('Sound interaction reset the race');

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
  if(!(await page.locator('#worldLoopSetup').isVisible()))throw new Error('Stop did not return to the country picker');

  const geometry=await page.evaluate(()=>{
    const card=document.querySelector('.world-loop-setup-card'),chip=document.querySelector('.world-loop-selected-chip');
    const grid=document.querySelector('.world-loop-selected');
    return {cardWidth:card.getBoundingClientRect().width,chipWidth:chip.getBoundingClientRect().width,
      chipHeight:chip.getBoundingClientRect().height,chipFont:parseFloat(getComputedStyle(chip.querySelector('strong')).fontSize),
      gridColumns:getComputedStyle(grid).gridTemplateColumns.split(' ').length};
  });
  if(geometry.cardWidth<950||geometry.cardWidth>1040||geometry.chipWidth<180||
     geometry.chipHeight<48||geometry.chipFont<11||geometry.gridColumns!==4)
    throw new Error('Country picker remains cramped on desktop: '+JSON.stringify(geometry));

  const carFacing=await page.evaluate(()=>{
    const car=document.createElement('span');
    car.className='world-loop-mascot world-loop-mascot--face-right';
    car.textContent='🏎️';
    document.querySelector('.world-loop-racer').append(car);
    const transform=getComputedStyle(car).transform;
    car.remove();
    return new DOMMatrixReadOnly(transform).a;
  });
  if(Math.abs(carFacing+1)>.01)throw new Error('The red racing-car emoji still faces left.');

  const add=page.locator('#worldLoopAddCountry');
  await add.focus();
  await page.keyboard.press('Enter');
  if(await add.getAttribute('aria-expanded')!=='true')throw new Error('Country picker not keyboard-accessible');
  const searchGeometry=await page.evaluate(()=>{
    const menu=document.querySelector('#worldLoopCountryMenu'),track=document.querySelector('.world-loop-viewport');
    const option=document.querySelector('.world-loop-country-option');
    const grid=document.querySelector('.world-loop-country-options');
    const rect=menu.getBoundingClientRect(),bounds=track.getBoundingClientRect();
    return {width:rect.width,height:rect.height,top:rect.top,bottom:rect.bottom,
      trackTop:bounds.top,trackBottom:bounds.bottom,
      columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      optionHeight:option.getBoundingClientRect().height};
  });
  if(searchGeometry.width<850||searchGeometry.height<155||searchGeometry.columns!==2||
     searchGeometry.optionHeight<44||searchGeometry.top<searchGeometry.trackTop-5||
     searchGeometry.bottom>searchGeometry.trackBottom+5)
    throw new Error('Country search menu is clipped or too small: '+JSON.stringify(searchGeometry));
  await page.locator('#worldLoopCountrySearch').fill('Argentina');
  await page.locator('.world-loop-country-option[data-code="AR"]').click();
  if(await page.locator('#worldLoopSelected .world-loop-selected-chip').count()!==9)
    throw new Error('Selecting a country from the bigger menu did not update the roster');
  await page.keyboard.press('Escape');
  await page.locator('.world-loop-selected-chip[aria-label="Remove Argentina"]').click();
  if(await page.locator('#worldLoopSelected .world-loop-selected-chip').count()!==8)
    throw new Error('Removing a country did not update the roster');
  await add.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  if(await add.getAttribute('aria-expanded')!=='false')throw new Error('Escape did not close country picker');
  if(await page.evaluate(()=>document.activeElement?.id)!=='worldLoopAddCountry')throw new Error('Country picker focus not restored');
  // Four-player sessions show exactly four ranks and no More badge.
  for(let removed=0;removed<4;removed++)
    await page.locator('#worldLoopSelected .world-loop-selected-chip').last().click();
  if(await page.locator('#worldLoopSelected .world-loop-selected-chip').count()!==4)
    throw new Error('Could not set up the minimum four-player session');
  await page.locator('#worldLoopStart').click();
  if(await page.locator('#worldLoopSetup').isVisible())throw new Error('Start after Stop failed');
  if(await page.locator('#worldLoopOrder li').count()!==4||
     await page.locator('#worldLoopOrder li.more').count()!==0)
    throw new Error('A four-player session should show four ranks without a remainder item');
  // On wide desktop viewports, the race must align with the footer's
  // established 1280px content container instead of stretching edge-to-edge.
  await page.setViewportSize({width:1600,height:900});
  const alignment=await page.evaluate(()=>{
    const race=document.querySelector('.world-loop-panel').getBoundingClientRect();
    const hero=document.querySelector('.world-loop-hero');
    const heroRect=hero.getBoundingClientRect(),heroStyle=getComputedStyle(hero);
    const footer=document.querySelector('.footer-inner');
    const footerRect=footer.getBoundingClientRect(),footerStyle=getComputedStyle(footer);
    return {
      raceLeft:race.left,raceRight:race.right,
      heroLeft:heroRect.left+parseFloat(heroStyle.paddingLeft),
      footerLeft:footerRect.left+parseFloat(footerStyle.paddingLeft),
      footerRight:footerRect.right-parseFloat(footerStyle.paddingRight)
    };
  });
  if(Math.abs(alignment.raceLeft-alignment.footerLeft)>1||
     Math.abs(alignment.raceRight-alignment.footerRight)>1||
     Math.abs(alignment.heroLeft-alignment.footerLeft)>1)
    throw new Error('Wide desktop World Loop is not aligned with footer content gutters: '+JSON.stringify(alignment));
  await page.setViewportSize({width:1280,height:900});
  console.log('PASS world-loop: auto-start, full width, live 3-speed switch, sound, Stop and resume');
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
