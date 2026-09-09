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

function warmGameModule(link){
  const slug=new URL(link.href,location.origin).pathname.split('/').filter(Boolean)[0];
  if(slug)import(`/assets/js/games/${slug}.js`).catch(()=>{});
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
  setupGamesSearch(gamesMenu);
  const closeGames=()=>{
    if(gamesMenu)gamesMenu.hidden=true;
    gamesToggle?.setAttribute('aria-expanded','false');
  };
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
    closeGames();
    if(open){closeMobileMenu();return;}
    mobileToggle.setAttribute('aria-expanded','true');
    mobileToggle.setAttribute('aria-label','Close menu');
    if(mobileMenu)mobileMenu.hidden=false;
  });
  mobileMenu?.addEventListener('click',event=>event.stopPropagation());
  gamesToggle?.addEventListener('click',event=>{
    event.stopPropagation();
    const open=gamesToggle.getAttribute('aria-expanded')==='true';
    closeGames();
    closeMobileMenu();
    gamesToggle.setAttribute('aria-expanded',String(!open));
    if(gamesMenu)gamesMenu.hidden=open;
    if(!open&&gamesMenu?._search)requestAnimationFrame(()=>gamesMenu._search.focus());
  });
  gamesMenu?.addEventListener('click',event=>event.stopPropagation());
  document.addEventListener('click',event=>{
    closeGames();
    if(mobileMenu&&!mobileMenu.hidden&&!mobileMenu.contains(event.target)&&!mobileToggle?.contains(event.target))closeMobileMenu();
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const gamesWasOpen=gamesMenu&&!gamesMenu.hidden,mobileWasOpen=mobileMenu&&!mobileMenu.hidden;
    closeGames();
    closeMobileMenu();
    if(gamesWasOpen)gamesToggle?.focus();
    else if(mobileWasOpen)mobileToggle?.focus();
  });
  $$('#mobileMenu a').forEach(link=>link.addEventListener('click',()=>closeMobileMenu()));
  window.addEventListener('resize',()=>{if(window.innerWidth>900)closeMobileMenu();},{passive:true});
}

function setupFooter(){
  const year=$('#footerYear');
  if(year)year.textContent=String(new Date().getFullYear());
}

setupNavigation();
setupNavigationWarmup();
setupFooter();
