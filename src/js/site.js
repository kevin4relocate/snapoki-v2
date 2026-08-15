import {api, post} from './api.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let authUser = null;
let googleScriptPromise = null;
let loginReturnFocus = null;
window.SnapokiAuth = {user:null, ready:false};

function setAccountState(user) {
  authUser = user || null;
  const skeleton = $('#accountSkeleton'), login = $('#loginButton'), userButton = $('#userButton'), userName = $('#userName'), userAvatar = $('#userAvatar');
  if (skeleton) skeleton.hidden = true;
  if (login) login.hidden = Boolean(user);
  if (userButton) { userButton.hidden = !user; userButton.setAttribute('aria-expanded','false'); }
  if (userName) userName.textContent = user?.display_name || 'Player';
  if (userAvatar) { userAvatar.src = user?.avatar_url || '/brand/avatar-placeholder.svg'; userAvatar.alt = user?.display_name ? `${user.display_name} avatar` : 'Player avatar'; }
  window.SnapokiAuth = {user: authUser, ready:true};
  window.dispatchEvent(new CustomEvent('snapoki:auth-changed', {detail:{user:authUser}}));
}

async function refreshAuth() {
  try { const data = await api('/api/me'); setAccountState(data.user || null); }
  catch (error) { console.warn('Auth state unavailable', error); setAccountState(null); }
  return window.SnapokiAuth;
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve,reject) => {
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      if (window.google?.accounts?.id) return resolve();
      existing.addEventListener('load',resolve,{once:true}); existing.addEventListener('error',reject,{once:true}); return;
    }
    const script=document.createElement('script'); script.src='https://accounts.google.com/gsi/client'; script.async=true; script.defer=true; script.dataset.googleIdentity='1'; script.onload=resolve; script.onerror=reject; document.head.appendChild(script);
  });
  return googleScriptPromise;
}

function trapModal(modal) {
  if (modal._trapHandler) document.removeEventListener('keydown',modal._trapHandler);
  const focusables=()=>$$('button,[href],input,[tabindex]:not([tabindex="-1"])',modal).filter(el=>!el.hidden&&!el.disabled);
  const handler=event=>{
    if(event.key==='Escape'){event.preventDefault();closeLoginModal();return;}
    if(event.key!=='Tab')return;
    const items=focusables();if(!items.length)return;const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  modal._trapHandler=handler;document.addEventListener('keydown',handler);
}

function closeLoginModal() {
  const modal=$('#loginModal');if(!modal||modal.hidden)return;modal.hidden=true;document.body.classList.remove('modal-open');
  if(modal._trapHandler){document.removeEventListener('keydown',modal._trapHandler);modal._trapHandler=null;}
  loginReturnFocus?.focus?.();loginReturnFocus=null;
}

async function openLoginModal() {
  const modal=$('#loginModal'),host=$('#googleSignInHost'),message=$('#loginMessage');if(!modal||!host)return;
  loginReturnFocus=document.activeElement;modal.hidden=false;document.body.classList.add('modal-open');trapModal(modal);$('#loginClose')?.focus();
  if(host.dataset.ready==='1'){message.textContent='Use your Google account to save scores and join rankings.';return;}
  message.textContent='Loading secure sign-in…';
  try{
    const config=await api('/api/config');if(!config.googleClientId){message.textContent='Google sign-in is not configured yet.';return;}
    await loadGoogleScript();
    window.google.accounts.id.initialize({client_id:config.googleClientId,callback:async response=>{message.textContent='Signing you in…';try{const out=await post('/api/auth/google',{credential:response.credential});setAccountState(out.user);closeLoginModal();}catch(error){message.textContent=error.message||'Sign-in failed. Please try again.';}}});
    host.replaceChildren();window.google.accounts.id.renderButton(host,{theme:'filled_black',size:'large',shape:'pill',text:'continue_with',width:280});host.dataset.ready='1';message.textContent='Use your Google account to save scores and join rankings.';
  }catch(error){console.warn(error);message.textContent='Sign-in is temporarily unavailable. Please try again.';}
}

function setupGamesSearch(gamesMenu){
  if(!gamesMenu)return;const links=$$('a[data-game-link]',gamesMenu);if(links.length<8)return;
  const input=document.createElement('input');input.type='search';input.className='games-search';input.placeholder='Search games…';input.setAttribute('aria-label','Search games');
  const empty=document.createElement('div');empty.className='games-search-empty';empty.textContent='No games found.';empty.hidden=true;
  gamesMenu.prepend(input);gamesMenu.appendChild(empty);
  input.addEventListener('input',()=>{const query=input.value.trim().toLowerCase();let visible=0;for(const link of links){const show=!query||link.textContent.toLowerCase().includes(query);link.hidden=!show;if(show)visible++;}empty.hidden=visible!==0;});
  gamesMenu._search=input;
}

function setupNavigation(){
  const mobileToggle=$('#mobileMenuToggle'),mobileMenu=$('#mobileMenu'),gamesToggle=$('#gamesMenuToggle'),gamesMenu=$('#gamesMenu'),accountButton=$('#userButton'),accountMenu=$('#accountMenu');
  setupGamesSearch(gamesMenu);
  const closeMenus=()=>{if(gamesMenu)gamesMenu.hidden=true;gamesToggle?.setAttribute('aria-expanded','false');if(accountMenu)accountMenu.hidden=true;accountButton?.setAttribute('aria-expanded','false');};
  mobileToggle?.addEventListener('click',()=>{const open=mobileToggle.getAttribute('aria-expanded')==='true';mobileToggle.setAttribute('aria-expanded',String(!open));mobileToggle.setAttribute('aria-label',open?'Open menu':'Close menu');if(mobileMenu)mobileMenu.hidden=open;closeMenus();});
  gamesToggle?.addEventListener('click',event=>{event.stopPropagation();const open=gamesToggle.getAttribute('aria-expanded')==='true';closeMenus();gamesToggle.setAttribute('aria-expanded',String(!open));if(gamesMenu)gamesMenu.hidden=open;if(!open&&gamesMenu?._search)requestAnimationFrame(()=>gamesMenu._search.focus());});
  gamesMenu?.addEventListener('click',event=>event.stopPropagation());
  accountButton?.addEventListener('click',event=>{event.stopPropagation();const open=accountButton.getAttribute('aria-expanded')==='true';closeMenus();accountButton.setAttribute('aria-expanded',String(!open));if(accountMenu)accountMenu.hidden=open;});
  document.addEventListener('click',closeMenus);
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const gamesWasOpen=gamesMenu&&!gamesMenu.hidden;closeMenus();if(gamesWasOpen)gamesToggle?.focus();if(mobileMenu&&!mobileMenu.hidden){mobileMenu.hidden=true;mobileToggle?.setAttribute('aria-expanded','false');mobileToggle?.setAttribute('aria-label','Open menu');mobileToggle?.focus();}});
  $$('#mobileMenu a').forEach(link=>link.addEventListener('click',()=>{if(mobileMenu)mobileMenu.hidden=true;mobileToggle?.setAttribute('aria-expanded','false');mobileToggle?.setAttribute('aria-label','Open menu');}));
}

function setupAuthActions(){
  $('#loginButton')?.addEventListener('click',openLoginModal);$('#loginClose')?.addEventListener('click',closeLoginModal);$('#loginModal')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeLoginModal();});
  $('#logoutButton')?.addEventListener('click',async()=>{try{await post('/api/logout');}catch(error){console.warn(error);}setAccountState(null);if($('#accountMenu'))$('#accountMenu').hidden=true;});
}
function setupFooter(){const year=$('#footerYear');if(year)year.textContent=String(new Date().getFullYear());}
setupNavigation();setupAuthActions();setupFooter();window.SnapokiAuthReady=refreshAuth();
