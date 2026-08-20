import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');

async function walk(dir){
  const out=[];
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else if(entry.name.endsWith('.html'))out.push(full);
  }
  return out;
}

function cleanNavigation(html){
  const desktopLink=/<a[^>]*class="[^"]*leaderboard-nav-link[^"]*"[^>]*>\s*(?:🏆\s*)?Leaderboard\s*<\/a>/g;
  const genericLink=/<a[^>]*href="\/leaderboard\/"[^>]*>\s*(?:🏆\s*)?Leaderboard\s*<\/a>/g;
  html=html.replace(desktopLink,'').replace(genericLink,'');

  const desktop=`<a class="nav-menu-button header-leaderboard-link" href="/leaderboard/" aria-label="Leaderboard">🏆 Leaderboard</a>`;
  const mobile=`<a class="leaderboard-mobile-link" href="/leaderboard/">🏆 Leaderboard</a>`;
  html=html.replace('<div id="accountSlot"',`${desktop}<div id="accountSlot"`);
  html=html.replace('<nav id="mobileMenu" class="mobile-menu" aria-label="Mobile navigation" hidden>',`<nav id="mobileMenu" class="mobile-menu" aria-label="Mobile navigation" hidden>${mobile}`);

  const style=`<style data-leaderboard-nav>.header-leaderboard-link{display:inline-flex}.leaderboard-mobile-link{font-weight:800!important;color:var(--text)!important;background:rgba(115,87,255,.08)}@media(max-width:900px){.header-leaderboard-link{display:none!important}}</style>`;
  if(!html.includes('data-leaderboard-nav'))html=html.replace('</head>',`${style}</head>`);
  return html;
}

for(const file of await walk(dist)){
  const html=await fs.readFile(file,'utf8');
  await fs.writeFile(file,cleanNavigation(html));
}
