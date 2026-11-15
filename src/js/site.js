const $=(selector,root=document)=>root.querySelector(selector),$$=(selector,root=document)=>[...root.querySelectorAll(selector)];

function setupGamesSearch(gamesMenu){
  if(!gamesMenu)return;
  const links=$$('a[data-game-link]',gamesMenu);
  if(links.length<8)return;
  const input=document.createElement('input');
  input.type='search';
  input.className='games-search';
  input.placeholder='Search games…';
  input.setAttribute('aria-label','Search games');
  const empty=document.createElement('div');
  empty.className='games-search-empty';
  empty.textContent='No games found.';
  empty.hidden=true;
  gamesMenu.prepend(input);
  gamesMenu.appendChild(empty);
  input.addEventListener('input',()=>{
    const query=input.value.trim().toLowerCase();
    let visible=0;
    for(const link of links){
      const show=!query||link.textContent.toLowerCase().includes(query);
      link.hidden=!show;
      if(show)visible++;
    }
    empty.hidden=visible!==0;
  });
  gamesMenu._search=input;
}

function setupBoardGamesMenu(gamesMenu,gamesToggle,mobileMenu){
  const animalLink=gamesMenu?.querySelector('a[data-game-link="animal-chess"]');
  if(!animalLink)return{toggle:null,menu:null};
  const wrap=document.createElement('div');
  wrap.className='games-menu-wrap board-games-menu-wrap';
  wrap.innerHTML='<button id="boardGamesMenuToggle" class="nav-menu-button" type="button" aria-haspopup="true" aria-expanded="false">Board Games <span aria-hidden="true">▾</span></button><div id="boardGamesMenu" class="games-dropdown" hidden></div>';
  const anchor=gamesToggle?.closest('.games-menu-wrap');
  if(anchor)anchor.insertAdjacentElement('beforebegin',wrap);else $('.desktop-nav')?.appendChild(wrap);
  const menu=$('#boardGamesMenu',wrap),toggle=$('#boardGamesMenuToggle',wrap);
  menu?.appendChild(animalLink);
  if(document.body.dataset.game==='animal-chess'&&toggle){toggle.style.color='var(--text)';toggle.style.background='rgba(115,87,255,.15)';}
  const mobileAnimal=mobileMenu?.querySelector('a[data-game-link="animal-chess"]');
  if(mobileAnimal&&!mobileMenu.querySelector('.mobile-board-games-label')){
    const label=document.createElement('span');label.className='mobile-board-games-label';label.textContent='BOARD GAMES';label.style.cssText='display:block;padding:12px 12px 4px;color:var(--muted-2);font-size:10px;font-weight:850;letter-spacing:.12em';
    mobileAnimal.insertAdjacentElement('beforebegin',label);
  }
  return{toggle,menu};
}

function warmGameModule(link){
  const slug=new URL(link.href,location.origin).pathname.split('/').filter(Boolean)[0];
  if(slug)import(`./games/${slug}.js`).catch(()=>{});
}

function setupNavigationWarmup(){
  for(const link of $$('a[data-game-link]')){
    link.addEventListener('pointerenter',()=>warmGameModule(link),{once:true,passive:true});
    link.addEventListener('focus',()=>warmGameModule(link),{once:true});
    link.addEventListener('touchstart',()=>warmGameModule(link),{once:true,passive:true});
  }
}

function setupNavigation(){
  const mobileToggle=$('#mobileMenuToggle'),mobileMenu=$('#mobileMenu'),gamesToggle=$('#gamesMenuToggle'),gamesMenu=$('#gamesMenu');
  const boardGames=setupBoardGamesMenu(gamesMenu,gamesToggle,mobileMenu),boardToggle=boardGames.toggle,boardMenu=boardGames.menu;
  setupGamesSearch(gamesMenu);
  const closeGames=()=>{if(gamesMenu)gamesMenu.hidden=true;gamesToggle?.setAttribute('aria-expanded','false');};
  const closeBoardGames=()=>{if(boardMenu)boardMenu.hidden=true;boardToggle?.setAttribute('aria-expanded','false');};
  const closeDesktopMenus=()=>{closeGames();closeBoardGames();};
  const closeMobileMenu=(restoreFocus=false)=>{
    if(!mobileMenu||mobileMenu.hidden)return;
    mobileMenu.hidden=true;
    mobileToggle?.setAttribute('aria-expanded','false');
    mobileToggle?.setAttribute('aria-label','Open menu');
    if(restoreFocus)mobileToggle?.focus();
  };
  mobileToggle?.addEventListener('click',event=>{
    event.stopPropagation();
    const open=mobileToggle.getAttribute('aria-expanded')==='true';
    closeDesktopMenus();
    if(open){closeMobileMenu();return;}
    mobileToggle.setAttribute('aria-expanded','true');
    mobileToggle.setAttribute('aria-label','Close menu');
    if(mobileMenu)mobileMenu.hidden=false;
  });
  mobileMenu?.addEventListener('click',event=>event.stopPropagation());
  gamesToggle?.addEventListener('click',event=>{
    event.stopPropagation();
    const open=gamesToggle.getAttribute('aria-expanded')==='true';
    closeDesktopMenus();closeMobileMenu();
    gamesToggle.setAttribute('aria-expanded',String(!open));
    if(gamesMenu)gamesMenu.hidden=open;
    if(!open&&gamesMenu?._search)requestAnimationFrame(()=>gamesMenu._search.focus());
  });
  boardToggle?.addEventListener('click',event=>{
    event.stopPropagation();
    const open=boardToggle.getAttribute('aria-expanded')==='true';
    closeDesktopMenus();closeMobileMenu();
    boardToggle.setAttribute('aria-expanded',String(!open));
    if(boardMenu)boardMenu.hidden=open;
  });
  gamesMenu?.addEventListener('click',event=>event.stopPropagation());
  boardMenu?.addEventListener('click',event=>event.stopPropagation());
  document.addEventListener('click',event=>{
    closeDesktopMenus();
    if(mobileMenu&&!mobileMenu.hidden&&!mobileMenu.contains(event.target)&&!mobileToggle?.contains(event.target))closeMobileMenu();
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const gamesWasOpen=gamesMenu&&!gamesMenu.hidden,boardWasOpen=boardMenu&&!boardMenu.hidden,mobileWasOpen=mobileMenu&&!mobileMenu.hidden;
    closeDesktopMenus();closeMobileMenu();
    if(boardWasOpen)boardToggle?.focus();else if(gamesWasOpen)gamesToggle?.focus();else if(mobileWasOpen)mobileToggle?.focus();
  });
  $$('#mobileMenu a').forEach(link=>link.addEventListener('click',()=>closeMobileMenu()));
  window.addEventListener('resize',()=>{if(window.innerWidth>900)closeMobileMenu();},{passive:true});
}

function setupFooter(){const year=$('#footerYear');if(year)year.textContent=String(new Date().getFullYear());}

setupNavigation();
setupNavigationWarmup();
setupFooter();
