const tabs=[['career','Career'],['skill','Skill'],['runs','Runs']];
const state={board:'career'};
const list=document.getElementById('globalLeaderboardList');
const status=document.getElementById('globalLeaderboardStatus');
const tabsHost=document.getElementById('globalLeaderboardTabs');
const yourRank=document.getElementById('globalLeaderboardYourRank');
const yourRankLabel=document.getElementById('globalLeaderboardYourRankLabel');
const signInButton=document.getElementById('leaderboardSignIn');

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatNumber=value=>new Intl.NumberFormat('en-US').format(Number(value||0));
const medal=position=>({1:'🥇',2:'🥈',3:'🥉'}[position]||position);

function metric(row,board){
  if(board==='career')return `<strong>${formatNumber(row.career_xp)}</strong><small>XP</small>`;
  if(board==='skill')return `<strong>${formatNumber(row.mastery_score)}</strong><small>MASTERY</small>`;
  return `<strong>${formatNumber(row.career_runs)}</strong><small>RUNS</small>`;
}

function secondary(row,board){
  if(board==='career')return `Lv. ${formatNumber(row.level)} · ${formatNumber(row.career_runs)} runs`;
  if(board==='skill')return `${formatNumber(row.career_runs)} runs · Lv. ${formatNumber(row.level)}`;
  return `${formatNumber(row.career_xp)} XP · Lv. ${formatNumber(row.level)}`;
}

function renderRows(rows){
  if(!rows.length){
    list.innerHTML='<div class="leaderboard-empty">No ranked players yet. Be the first on the board.</div>';
    return;
  }
  list.innerHTML=rows.map(row=>{
    const placeholder=row.placeholder;
    const avatar=row.avatar_url?`<img src="${escapeHtml(row.avatar_url)}" alt="" loading="lazy">`:`<span class="leaderboard-avatar-fallback">${escapeHtml((row.display_name||'P')[0].toUpperCase())}</span>`;
    return `<div class="leaderboard-row${row.is_me?' is-me':''}${placeholder?' is-placeholder':''}">
      <div class="leaderboard-position">${medal(row.position)}</div>
      <div class="leaderboard-player">${avatar}<div><strong>${escapeHtml(row.is_me?'YOU':row.display_name)}</strong><small>${secondary(row,state.board)}</small></div></div>
      <div class="leaderboard-score">${metric(row,state.board)}</div>
    </div>`;
  }).join('');
}

function renderMe(me){
  if(!me){
    yourRank.hidden=true;
    return;
  }
  yourRank.hidden=false;
  yourRankLabel.textContent=`Your ${state.board==='career'?'Career':state.board==='skill'?'Skill':'Runs'} rank`;
  document.getElementById('globalLeaderboardRankNumber').textContent=`#${formatNumber(me.position)}`;
  document.getElementById('globalLeaderboardRankMetric').textContent=state.board==='career'?`${formatNumber(me.career_xp)} XP`:state.board==='skill'?`${formatNumber(me.mastery_score)} Mastery`:`${formatNumber(me.career_runs)} runs`;
  const target=me.next_target;
  document.getElementById('globalLeaderboardRankHint').textContent=target?`${formatNumber(target.gap_value)} ${target.gap_label} to #${formatNumber(target.position)}`:'You are at the top of the board.';
}

function setLoading(){list.innerHTML='<div class="leaderboard-loading">Loading the board…</div>';status.textContent='';}

async function load(){
  setLoading();
  try{
    const response=await fetch(`/api/global-rankings?board=${encodeURIComponent(state.board)}&limit=25`,{credentials:'include',headers:{accept:'application/json'}});
    const data=await response.json();
    if(!response.ok)throw new Error(data?.error||'Leaderboard unavailable.');
    renderRows(data.rows||[]);
    renderMe(data.me||null);
    if(signInButton)signInButton.hidden=Boolean(data.me);
    status.textContent=state.board==='career'?'Earn XP every verified completion. Harder puzzles reward more.':state.board==='skill'?'Mastery is the sum of your best verified performance across every game.':'Every verified completion counts. Play more to climb.';
  }catch(error){
    list.innerHTML='<div class="leaderboard-error"><strong>Leaderboard unavailable</strong><span>Try again in a moment.</span><button class="button button-secondary" id="leaderboardRetry" type="button">Retry</button></div>';
    document.getElementById('leaderboardRetry')?.addEventListener('click',load,{once:true});
    yourRank.hidden=true;
  }
}

tabsHost.innerHTML=tabs.map(([key,label])=>`<button class="leaderboard-tab${key===state.board?' active':''}" type="button" data-board="${key}" role="tab" aria-selected="${key===state.board?'true':'false'}">${label}</button>`).join('');
tabsHost.addEventListener('click',event=>{
  const button=event.target.closest('[data-board]');
  if(!button)return;
  state.board=button.dataset.board;
  tabsHost.querySelectorAll('[data-board]').forEach(item=>{
    item.classList.toggle('active',item===button);
    item.setAttribute('aria-selected',item===button?'true':'false');
  });
  load();
});

signInButton?.addEventListener('click',()=>document.getElementById('loginButton')?.click());
load();
