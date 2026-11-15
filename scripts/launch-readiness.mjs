import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES} from '../src/js/games-config.js';
import {getGameGuide} from '../src/js/game-guide.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const siteUrl='https://snapoki.com';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SOCIAL=['https://www.linkedin.com/company/snapoki/','https://www.instagram.com/playsnapoki/','https://x.com/playsnapoki','https://www.facebook.com/playsnapoki'];

async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}
async function writePage(slug,html){const dir=path.join(dist,slug);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),html);}
function replaceMeta(html,{title,description,canonical,type='website',robots='index,follow,max-image-preview:large'}){
  const swaps=[
    [/<title>[\s\S]*?<\/title>/,`<title>${esc(title)}</title>`],
    [/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`],
    [/<link rel="canonical" href="[^"]*">/,`<link rel="canonical" href="${canonical}">`],
    [/<meta property="og:type" content="[^"]*">/,`<meta property="og:type" content="${type}">`],
    [/<meta property="og:title" content="[^"]*">/,`<meta property="og:title" content="${esc(title)}">`],
    [/<meta property="og:description" content="[^"]*">/,`<meta property="og:description" content="${esc(description)}">`],
    [/<meta property="og:url" content="[^"]*">/,`<meta property="og:url" content="${canonical}">`],
    [/<meta name="twitter:title" content="[^"]*">/,`<meta name="twitter:title" content="${esc(title)}">`],
    [/<meta name="twitter:description" content="[^"]*">/,`<meta name="twitter:description" content="${esc(description)}">`]
  ];
  for(const [re,val] of swaps)html=html.replace(re,val);
  if(!html.includes('name="robots"'))html=html.replace('</head>',`<meta name="robots" content="${robots}"></head>`);
  if(!html.includes('property="og:locale"'))html=html.replace('</head>','<meta property="og:locale" content="en_US"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="application-name" content="Snapoki"><meta name="color-scheme" content="dark"></head>');
  if(!html.includes('/assets/styles/launch.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/styles/launch.css"></head>');
  return html;
}
function addJsonLd(html,data){const json=JSON.stringify(data).replace(/</g,'\\u003c');return html.replace('</head>',`<script type="application/ld+json">${json}</script></head>`);}
function fromTemplate(template,{slug,title,description,content,type='website',jsonLd=[],bodyClass='content-page-shell',robots}){
  const canonical=slug?`${siteUrl}/${slug}/`:`${siteUrl}/`;
  let html=template.replace(/<main>[\s\S]*?<\/main>/,`<main>${content}</main>`).replace(/<body class="[^"]*"/,`<body class="${bodyClass}"`);
  html=replaceMeta(html,{title,description,canonical,type,robots});
  for(const item of jsonLd)html=addJsonLd(html,item);
  return html;
}
function breadcrumbs(items){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:item.url}))};}

function svgShell(name,body){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500" role="img" aria-label="${esc(name)} guide preview"><defs><linearGradient id="a" x1="80" y1="40" x2="820" y2="450"><stop stop-color="#7457ff"/><stop offset="1" stop-color="#23c9f5"/></linearGradient><filter id="g"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="900" height="500" rx="32" fill="#0b1020"/><rect x="30" y="30" width="840" height="440" rx="25" fill="#0f1628" stroke="#273453" stroke-width="2"/>${body}</svg>`;}
function gridRects(rows,cols,{x=120,y=55,w=660,h=390}={}){let out='';const cw=w/cols,ch=h/rows;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)out+=`<rect x="${x+c*cw+4}" y="${y+r*ch+4}" width="${cw-8}" height="${ch-8}" rx="9" fill="#111a2d" stroke="#33415e"/>`;return out;}
function illustrationSvg(key,name){
  if(key==='echo-step')return svgShell(name,`${gridRects(6,6,{x:245,y:52,w:430,h:396})}<circle cx="284" cy="414" r="24" fill="#917fff" stroke="#fff" stroke-opacity=".65" stroke-width="3"/><text x="284" y="420" fill="#fff" font-family="system-ui" font-size="12" font-weight="900" text-anchor="middle">YOU</text><circle cx="638" cy="86" r="19" fill="none" stroke="#5de1ff" stroke-width="4"/><text x="638" y="92" fill="#a9efff" font-family="system-ui" font-size="14" font-weight="900" text-anchor="middle">E</text><circle cx="466" cy="215" r="23" fill="none" stroke="#917fff" stroke-width="4" stroke-dasharray="7 6"/><text x="466" y="222" fill="#c8bfff" font-family="system-ui" font-size="16" font-weight="900" text-anchor="middle">P</text><circle cx="552" cy="215" r="21" fill="none" stroke="#5de1ff" stroke-width="3" stroke-dasharray="6 5"/><text x="552" y="222" fill="#b9f3ff" font-family="system-ui" font-size="15" font-weight="900" text-anchor="middle">E</text><text x="72" y="92" fill="#f4f7ff" font-family="system-ui" font-size="30" font-weight="800">Move now.</text><text x="72" y="126" fill="#9aa9c9" font-family="system-ui" font-size="18" font-weight="650">Echo follows later.</text>`);
  if(key==='maze')return svgShell(name,`<g stroke="#5e6b88" stroke-width="8" stroke-linecap="round">${[[120,90,120,390],[120,90,350,90],[220,90,220,290],[220,290,410,290],[350,90,350,210],[350,210,520,210],[410,290,410,410],[410,410,680,410],[520,90,520,210],[520,90,760,90],[630,90,630,300],[630,300,760,300],[760,90,760,410]].map(x=>`<path d="M${x[0]} ${x[1]}L${x[2]} ${x[3]}"/>`).join('')}</g><circle cx="155" cy="130" r="18" fill="#7457ff"/><circle cx="725" cy="365" r="18" fill="#35dda2"/>`);
  if(key==='number-path')return svgShell(name,`${gridRects(6,6,{x:180,y:48,w:540,h:408})}${[[0,0,'1','#7457ff'],[1,3,'8','#ff5b7d'],[3,5,'17','#23c9f5'],[5,1,'26','#35dda2']].map(([r,c,n,col])=>`<circle cx="${225+c*90}" cy="${82+r*68}" r="24" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-width="3"/><text x="${225+c*90}" y="${89+r*68}" fill="#fff" font-family="system-ui" font-size="20" font-weight="800" text-anchor="middle">${n}</text>`).join('')}`);
  if(key==='color-connect')return svgShell(name,`${gridRects(6,8,{x:105,y:55,w:690,h:396})}${[[0,0,'#ff5b7d'],[4,6,'#ff5b7d'],[0,6,'#35dda2'],[3,2,'#35dda2'],[2,0,'#4d9cff'],[5,4,'#4d9cff'],[1,5,'#ffc247'],[5,1,'#ffc247']].map(([r,c,col])=>`<circle cx="${148+c*86}" cy="${88+r*66}" r="14" fill="${col}"/>`).join('')}`);
  if(key==='lights-out'){let cells='';for(let r=0;r<6;r++)for(let c=0;c<8;c++){const x=105+c*86,y=55+r*66,lit=(r*3+c*2)%5===0||(r+c)%7===2;cells+=`<rect x="${x}" y="${y}" width="74" height="55" rx="10" fill="${lit?'#4f3817':'#111a2d'}" stroke="${lit?'#ffbc42':'#33415e'}"/>`;if(lit)cells+=`<circle cx="${x+37}" cy="${y+27}" r="10" fill="#ffd56a"/>`;}return svgShell(name,cells);}
  if(key==='loop-puzzle'){let grid='';for(let i=0;i<=7;i++){const x=155+i*86;grid+=`<path d="M${x} 70V420M150 ${70+i*50}H752" stroke="#35425f" stroke-width="3"/>`;}const clues=[[1,2,2],[1,5,1],[2,1,3],[2,4,2],[3,3,1],[3,6,3],[4,2,2],[5,4,3],[6,1,1],[6,5,2]].map(([r,c,n])=>`<text x="${193+c*86}" y="${105+r*50}" fill="${n===3?'#ffc46b':n===2?'#cbbcff':'#92e7f7'}" font-family="system-ui" font-size="28" font-weight="750" text-anchor="middle">${n}</text>`).join('');return svgShell(name,grid+clues);}
  if(key==='world-loop')return svgShell(name,'<rect x="94" y="70" width="710" height="350" rx="18" fill="#242b39"/><g stroke="#78849e" stroke-width="2" opacity=".72"><path d="M95 128H804M95 186H804M95 244H804M95 302H804M95 360H804"/></g><g stroke="#7d89a6" stroke-width="3" stroke-dasharray="15 18" opacity=".48"><path d="M180 99H780M180 157H780M180 215H780M180 273H780M180 331H780"/></g><g font-size="31"><text x="120" y="116">🇻🇳</text><text x="120" y="174">🇯🇵</text><text x="120" y="232">🇧🇷</text><text x="120" y="290">🇺🇸</text><text x="120" y="348">🇰🇷</text></g><g font-size="35"><text x="430" y="116">🏎️</text><text x="565" y="174">🚀</text><text x="485" y="232">🦊</text><text x="635" y="290">🤖</text><text x="520" y="348">🐇</text></g><g fill="#9aa9c9" font-family="system-ui" font-size="20" font-weight="900"><text x="775" y="116">→</text><text x="775" y="174">→</text><text x="775" y="232">→</text><text x="775" y="290">→</text><text x="775" y="348">→</text></g><text x="450" y="457" fill="#f4f7ff" font-family="system-ui" font-size="27" font-weight="900" text-anchor="middle">NO FINISH LINE · DISTANCE KEEPS GROWING</text>');
  return svgShell(name,`${gridRects(6,8,{x:105,y:55,w:690,h:396})}<circle cx="450" cy="250" r="70" fill="url(#a)" opacity=".16"/><text x="450" y="266" fill="#e8ecff" font-family="system-ui" font-size="54" font-weight="900" text-anchor="middle">${esc(name.slice(0,2).toUpperCase())}</text>`);
}



function guideArticle(g){
  const extra=getGameGuide(g);
  const guideUrl=`${siteUrl}/blog/how-to-play-${g.slug}/`,gameUrl=`${siteUrl}/${g.slug}/`;
  const steps=g.howTo.map((x,i)=>`<li><strong>Step ${i+1}.</strong> ${esc(x)}</li>`).join('');
  const tips=extra.tips.map(x=>`<li>${esc(x)}</li>`).join(''),mistakes=extra.mistakes.map(x=>`<li>${esc(x)}</li>`).join('');
  const toolSection=`<h2>${esc(extra.controls.heading)}</h2><p>${esc(extra.controls.body)}</p>`;
  const dailySection=`<h2>${esc(extra.format.heading)}</h2><p>${esc(extra.format.body)}</p>`;
  return {slug:`blog/how-to-play-${g.slug}`,title:`How to Play ${g.name}: Rules, Controls & Strategy | Snapoki`,description:`Learn how to play ${g.name} on Snapoki: core rules, controls, modes, practical strategy, common mistakes and replayable features.`,content:`<section class="content-page guide-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/blog/">Guides</a><span>›</span><span>${esc(g.name)}</span></nav><div class="content-hero guide-hero"><span class="eyebrow">${esc(g.category)} game guide</span><h1>How to Play ${esc(g.name)}</h1><p>${esc(g.description)}</p><div class="guide-actions"><a class="button button-primary" href="/${g.slug}/">Play ${esc(g.name)}</a><a class="button button-secondary" href="#rules">Read the rules</a></div></div><article><figure class="guide-figure"><img src="/brand/guides/${g.slug}.svg" width="900" height="500" alt="${esc(g.name)} ${g.experienceType==='simulation'?'simulation preview':g.experienceType==='board'?'board setup preview':'puzzle preview without a solution shown'}"><figcaption>A representative ${esc(g.name)} ${g.experienceType==='simulation'?'simulation':g.experienceType==='board'?'starting position':'unsolved puzzle'} preview.</figcaption></figure><h2 id="rules">The objective</h2><p>${esc(extra.focus)}</p><h2>Rules and controls</h2><ol class="guide-steps">${steps}</ol><h2>${esc(g.ui?.guideControlTitle||'Easy, Medium and Hard')}</h2><div class="difficulty-explainer">${g.levels.map(([key,label,detail])=>`<div><span class="difficulty-dot difficulty-dot--${key}"></span><strong>${esc(label)}</strong><p>${esc(detail)}</p></div>`).join('')}</div><p>${esc(extra.difficultyCopy)}</p><h2>Strategy that helps</h2><ul>${tips}</ul><h2>Common mistakes</h2><ul>${mistakes}</ul>${toolSection}${dailySection}<div class="article-cta"><div><span class="eyebrow">Ready to try it?</span><h2>Play ${esc(g.name)} now</h2><p>${esc(extra.ctaCopy)}</p></div><a class="button button-primary" href="/${g.slug}/">Play ${esc(g.name)}</a></div></article></section>`,jsonLd:[breadcrumbs([{name:'Snapoki',url:`${siteUrl}/`},{name:'Guides',url:`${siteUrl}/blog/`},{name:`How to Play ${g.name}`,url:guideUrl}]),{'@context':'https://schema.org','@type':'HowTo',name:`How to Play ${g.name}`,description:g.description,url:guideUrl,image:`${siteUrl}/brand/guides/${g.slug}.svg`,step:g.howTo.map((text,i)=>({'@type':'HowToStep',position:i+1,name:`Step ${i+1}`,text}))},{'@context':'https://schema.org','@type':'WebApplication',name:g.name,url:gameUrl,applicationCategory:'GameApplication',operatingSystem:'Any',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}}]};
}

await fs.mkdir(path.join(dist,'brand','guides'),{recursive:true});
for(const g of GAMES)await fs.writeFile(path.join(dist,'brand','guides',`${g.slug}.svg`),illustrationSvg(g.key,g.name));

let template=await fs.readFile(path.join(dist,'index.html'),'utf8');
const blogCards=GAMES.map(g=>`<a class="guide-card" href="/blog/how-to-play-${g.slug}/"><img src="/brand/guides/${g.slug}.svg" width="900" height="500" loading="lazy" alt="${esc(g.name)} guide illustration"><div><span class="eyebrow">${esc(g.category)} guide</span><h2>How to Play ${esc(g.name)}</h2><p>${esc(g.description)}</p><span class="text-link">Read guide →</span></div></a>`).join('');
const blogContent=`<section class="content-page blog-index"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>Guides</span></nav><div class="content-hero"><span class="eyebrow">Game guides</span><h1>Learn the rules. Find your next game.</h1><p>Clear, practical guides for every Snapoki experience, from logic puzzles to board games and simulations. Learn the objective, controls, modes, useful strategies and common mistakes.</p></div><div class="guide-grid">${blogCards}</div><article><h2>Different games, different challenges</h2><p>Puzzles test routes, clues and deduction. Board games use legal moves, turns, opponents and match objectives. Simulations focus on interacting with an ongoing process. Each guide explains the controls and goals for its own game type.</p><h2>Play at your pace</h2><p>Try a puzzle Hint when available, read board game rules before making a move, or experiment with simulation controls. Not every game has a Daily Challenge or a single solution.</p></article></section>`;
let blogHtml=fromTemplate(template,{slug:'blog',title:'Snapoki Game Guides – Rules, Controls & Strategy',description:`Explore guides for all ${GAMES.length} Snapoki games, from logic puzzles to board games and simulations, with rules, controls and playing tips.`,content:blogContent,jsonLd:[breadcrumbs([{name:'Snapoki',url:`${siteUrl}/`},{name:'Guides',url:`${siteUrl}/blog/`}]),{'@context':'https://schema.org','@type':'CollectionPage',name:'Snapoki Puzzle Guides',url:`${siteUrl}/blog/`,description:'How-to guides and strategy for Snapoki puzzle games.'}]});
await writePage('blog',blogHtml);
for(const g of GAMES){const guide=guideArticle(g);await writePage(guide.slug,fromTemplate(template,{slug:guide.slug,title:guide.title,description:guide.description,content:guide.content,type:'article',jsonLd:guide.jsonLd,bodyClass:'content-page-shell article-shell'}));}

for(const g of GAMES){
  const file=path.join(dist,g.slug,'index.html');let html=await fs.readFile(file,'utf8');
  html=addJsonLd(html,breadcrumbs([{name:'Snapoki',url:`${siteUrl}/`},{name:g.name,url:`${siteUrl}/${g.slug}/`} ]));
  html=addJsonLd(html,{'@context':'https://schema.org','@type':'WebApplication',name:g.name,url:`${siteUrl}/${g.slug}/`,description:g.description,applicationCategory:'GameApplication',operatingSystem:'Any',offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}});
  await fs.writeFile(file,html);
}

for(const slug of ['help','privacy','terms']){const file=path.join(dist,slug,'index.html');try{let html=await fs.readFile(file,'utf8');if(!html.includes('mailto:contact@snapoki.com'))html=html.replace('</article>',`<div class="callout contact-callout"><strong>Contact Snapoki</strong><span>For support, privacy or terms questions, email <a href="mailto:contact@snapoki.com">contact@snapoki.com</a>.</span></div></article>`);await fs.writeFile(file,html);}catch{}}

const notFound=fromTemplate(template,{slug:'404',title:'Page Not Found | Snapoki',description:'The requested Snapoki page could not be found.',robots:'noindex,follow',content:`<section class="content-page not-found"><div class="content-hero"><span class="eyebrow">404</span><h1>That path does not exist.</h1><p>The puzzle may have moved, or the address may be incomplete. Choose a game and keep playing.</p><div class="guide-actions"><a class="button button-primary" href="/">Back to Snapoki</a><a class="button button-secondary" href="/blog/">Puzzle Guides</a></div></div></section>`});
await fs.writeFile(path.join(dist,'404.html'),notFound);

let files=(await walk(dist)).filter(file=>file.endsWith('.html')&&!file.endsWith('404.html'));
const urls=[];
for(const file of files){const html=await fs.readFile(file,'utf8');if(/name="robots" content="noindex/i.test(html)||html.includes('data-private-utility="true"'))continue;const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/)||[])[1];if(canonical&&canonical.startsWith(siteUrl)&&!urls.includes(canonical))urls.push(canonical);}
urls.sort((a,b)=>a.localeCompare(b));
const priority=url=>url===`${siteUrl}/`?'1.0':GAMES.some(g=>url===`${siteUrl}/${g.slug}/`)?'0.9':url===`${siteUrl}/blog/`?'0.8':url.includes('/blog/how-to-play-')?'0.7':'0.6';
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${esc(url)}</loc><priority>${priority(url)}</priority></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(dist,'sitemap.xml'),sitemap);
await fs.writeFile(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /cdn-cgi/\nDisallow: /snapdesk-74kq/\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

const homeFile=path.join(dist,'index.html');let home=await fs.readFile(homeFile,'utf8');home=addJsonLd(home,{'@context':'https://schema.org','@type':'Organization',name:'Snapoki',url:`${siteUrl}/`,logo:`${siteUrl}/brand/logo-mark-512.png`,sameAs:SOCIAL});await fs.writeFile(homeFile,home);
console.log(`Launch readiness complete: ${GAMES.length} game guides, ${urls.length} indexable URLs, robots.txt and sitemap.xml.`);
