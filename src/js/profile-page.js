import {api} from './api.js';
import {GAMES,DIFFICULTY_REWARDS} from './games-config.js';

const $=(selector,root=document)=>root.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>Math.max(0,Number(value||0));
let lastIdentity='initial';
let requestToken=0;

function emptyStats(){
  return {games:0,ranking_score:0,xp:0,level:1,streak:0,longest_streak:0,mastery:{}};
}

function masteryValue(stats,key){
  const item=stats?.mastery?.[key];
  return item?.complete?number(item.rank_score):0;
}

function gameCard(game,stats){
  const runs=number(stats.games),overall=number(stats.ranking_score),streak=number(stats.streak),level=Math.max(1,Number(stats.level||1));
  const mastery=game.levels.map(([key,label])=>{
    const score=masteryValue(stats,key);
    return `<div class="account-mastery${score?' complete':''}"><span>${escapeHtml(label)} · ×${DIFFICULTY_REWARDS[key]||1}</span><b>${score?`${score.toLocaleString()} PB`:'—'}</b></div>`;
  }).join('');
  return `<article class="account-game-card"><div class="account-game-card-head"><div><span class="eyebrow">${escapeHtml(game.category)} puzzle</span><h2>${escapeHtml(game.name)}</h2></div><a href="/${game.slug}/">Play →</a></div><div class="account-game-summary"><div><b>${runs.toLocaleString()}</b><small>${runs===1?'RUN':'RUNS'}</small></div><div><b>${overall?overall.toLocaleString():'—'}</b><small>OVERALL PB</small></div><div><b>${level}</b><small>LEVEL</small></div><div><b>${streak}</b><small>DAILY STREAK</small></div></div><div class="account-mastery-list">${mastery}</div></article>`;
}

function renderGuest(){
  const host=$('#accountProfile');if(!host)return;
  host.className='account-profile-state';
  host.innerHTML='<div class="account-profile-guest"><div class="account-profile-guest-icon">S</div><h2>Sign in to see your progress</h2><p>Your profile combines verified runs, Personal Bests, levels and Daily streaks across every Snapoki game.</p><button class="button button-primary" type="button" id="profileSignIn">Sign in with Google</button></div>';
  $('#profileSignIn')?.addEventListener('click',async()=>{
    try{if(window.SnapokiAuthReady)await window.SnapokiAuthReady;}catch{}
    $('#loginButton')?.click();
  });
}

function renderProfile(data){
  const host=$('#accountProfile');if(!host)return;
  if(!data?.user){renderGuest();return;}
  const rows=new Map((data.games||[]).map(item=>[item.game,item]));
  const totals=data.totals||{};
  const avatar=data.user.avatar_url?`<img src="${escapeHtml(data.user.avatar_url)}" alt="">`:'<span class="account-profile-avatar-fallback">S</span>';
  host.className='account-profile-state is-ready';
  host.innerHTML=`<section class="account-profile-overview"><div class="account-profile-person">${avatar}<div><span>Signed in as</span><h2>${escapeHtml(data.user.display_name||'Player')}</h2></div></div><div class="account-profile-totals"><div><b>${number(totals.runs).toLocaleString()}</b><small>TOTAL RUNS</small></div><div><b>${number(totals.xp).toLocaleString()}</b><small>TOTAL XP</small></div><div><b>${number(totals.games_played)}</b><small>GAMES PLAYED</small></div><div><b>${number(totals.best_streak)}</b><small>BEST STREAK</small></div></div></section><section class="account-profile-games">${GAMES.map(game=>gameCard(game,rows.get(game.key)||emptyStats())).join('')}</section>`;
}

async function loadProfile(){
  const token=++requestToken,host=$('#accountProfile');
  if(host&&!host.querySelector('.account-profile-overview'))host.innerHTML='<div class="account-profile-loading">Loading your profile…</div>';
  try{
    const data=await api('/api/profile');
    if(token!==requestToken)return;
    lastIdentity=data?.user?.id==null?'guest':String(data.user.id);
    renderProfile(data);
  }catch(error){
    if(token!==requestToken)return;
    console.warn('Profile page unavailable',error);
    if(host)host.innerHTML='<div class="account-profile-error"><b>Profile is temporarily unavailable.</b><span>Your games still work normally. Try again in a moment.</span><button class="button button-secondary" type="button">Retry</button></div>';
    host?.querySelector('button')?.addEventListener('click',loadProfile);
  }
}

window.addEventListener('snapoki:auth-changed',event=>{
  const identity=event.detail?.user?.id==null?'guest':String(event.detail.user.id);
  if(lastIdentity==='initial'||identity===lastIdentity)return;
  lastIdentity=identity;
  loadProfile();
});

loadProfile();
