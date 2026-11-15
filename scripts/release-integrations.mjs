// Shared release integrations: analytics, social identity, robots metadata, content shell safety, FAQ and privacy disclosure.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const GA_ID='G-ED1P696TW8';
const SOCIAL={
  linkedin:'https://www.linkedin.com/company/snapoki/',
  instagram:'https://www.instagram.com/playsnapoki/',
  x:'https://x.com/playsnapoki',
  facebook:'https://www.facebook.com/playsnapoki'
};
const sameAs=Object.values(SOCIAL);

const analytics=`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${GA_ID}');\n</script>`;
const social=`<div class="footer-social" aria-label="Snapoki social links"><a href="${SOCIAL.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on LinkedIn"><span class="social-glyph" aria-hidden="true">in</span><span>LinkedIn</span></a><a href="${SOCIAL.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on Instagram"><span class="social-glyph" aria-hidden="true">IG</span><span>Instagram</span></a><a href="${SOCIAL.x}" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on X"><span class="social-glyph social-glyph--x" aria-hidden="true">X</span><span>@playsnapoki</span></a><a href="${SOCIAL.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on Facebook"><span class="social-glyph" aria-hidden="true">f</span><span>Facebook</span></a></div>`;
const faq=`<section class="section faq"><div class="section-heading"><div><span class="eyebrow">FAQ</span><h2>Play without friction</h2></div></div><details><summary>Is Snapoki free?</summary><p>Yes. Every Snapoki puzzle can be played for free in a modern browser, with no download required.</p></details><details><summary>Do I need an account?</summary><p>No. Snapoki has no public account or sign-in flow. Open any game and play immediately.</p></details><details><summary>What is a Daily Challenge?</summary><p>Games that support Daily Challenges provide Easy, Medium and Hard boards for the current UTC date. Complete all three to finish the daily set. Progress stays in this browser. Board games and simulations may not have Daily Challenges. <a href="/daily-challenges/">Learn how Daily Challenges work.</a></p></details><details><summary>How does difficulty work?</summary><p>Difficulty changes the reasoning pressure, not just the board size. Depending on the game it can reduce clues, add blockers and bottlenecks, increase route decisions, deepen traps, or require a higher minimum number of logical moves.</p></details><details><summary>What happens when I use Solution?</summary><p>Solution shows a complete practice guide directly on the board. Start a New Puzzle whenever you want a fresh challenge.</p></details></section>`;

async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}
function addAnalytics(html){if(html.includes(`googletagmanager.com/gtag/js?id=${GA_ID}`))return html;return html.replace('</head>',`${analytics}</head>`);}
function addSocial(html){if(html.includes('class="footer-social"'))return html;return html.replace(/(<div class="footer-brand">[\s\S]*?<p>[\s\S]*?<\/p>)/,`$1${social}`);}
function addSocialMeta(html){
  if(!html.includes('name="twitter:site"'))html=html.replace('</head>','<meta name="twitter:site" content="@playsnapoki"></head>');
  else html=html.replace(/<meta name="twitter:site" content="[^"]*">/,'<meta name="twitter:site" content="@playsnapoki">');
  if(!html.includes('property="og:image:alt"'))html=html.replace('</head>','<meta property="og:image:alt" content="Snapoki puzzle games"><meta name="twitter:image:alt" content="Snapoki puzzle games"></head>');
  return html;
}
function normalizeRobots(html,file,isPrivateUtility){
  if(isPrivateUtility)return html;
  const value=file===path.join(dist,'404.html')?'noindex,follow':'index,follow,max-image-preview:large';
  if(/<meta name="robots" content="[^"]*">/i.test(html))return html.replace(/<meta name="robots" content="[^"]*">/i,`<meta name="robots" content="${value}">`);
  return html.replace('</head>',`<meta name="robots" content="${value}"></head>`);
}
function ensureContentStyle(html){
  if(!/(class="content-page(?:\s|"))|(class="content-page-shell)/.test(html)||html.includes('/assets/styles/content.css'))return html;
  return html.replace('</head>','<link rel="stylesheet" href="/assets/styles/content.css"></head>');
}
function updateOrganization(html){
  return html.replace(/"email":"contact@snapoki\.com"/,`"sameAs":${JSON.stringify(sameAs)}`).replace(/"sameAs":\[[^\]]*\]/,`"sameAs":${JSON.stringify(sameAs)}`);
}
function updatePrivacy(html){
  if(html.includes('<h2>Analytics</h2>'))return html;
  const section='<h2>Analytics</h2><p>Snapoki uses Google Analytics to understand aggregate site usage, including page visits, device and browser characteristics, approximate geography and interaction patterns. Analytics is not required to play.</p>';
  html=html.replace('<h2>Cookies</h2>',`${section}<h2>Cookies</h2>`);
    return html;
}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  let html=await fs.readFile(file,'utf8');
  const isPrivateUtility=html.includes('data-private-utility="true"');
  html=normalizeRobots(html,file,isPrivateUtility);
  html=ensureContentStyle(html);
  if(!isPrivateUtility){html=addAnalytics(html);html=addSocial(html);html=addSocialMeta(html);}
  if(file===path.join(dist,'index.html')){html=html.replace(/<section class="section faq">[\s\S]*?<\/section>/,faq);html=updateOrganization(html);}
  if(file===path.join(dist,'privacy','index.html'))html=updatePrivacy(html);
  await fs.writeFile(file,html);
}

const launchFile=path.join(dist,'assets','styles','launch.css');let css=await fs.readFile(launchFile,'utf8');if(!css.includes('/* final release integrations */'))css+=`\n\n/* final release integrations */\n.home-page .faq{width:100%;max-width:calc(var(--content-max) + (var(--site-shell-gutter) * 2));margin-left:auto;margin-right:auto}\n.home-page .faq a{color:#68d9f6;text-decoration:none}.home-page .faq a:hover{color:#fff}\n.footer-social{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:18px}\n.footer-social a{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 11px;border:1px solid #27314a;border-radius:999px;color:#aab4ca;font-size:12px;font-weight:720;transition:border-color .16s ease,color .16s ease,background .16s ease}\n.footer-social a:hover{color:#fff;border-color:#4a5d86;background:#11182a}\n.social-glyph{width:18px;height:18px;border-radius:5px;display:inline-grid;place-items:center;background:#e8eefc;color:#0a0d16;font-size:10px;font-weight:900;line-height:1}.social-glyph--x{background:transparent;color:#e8eefc;border:1px solid #55617a;font-size:9px}\n`;
await fs.writeFile(launchFile,css);
console.log(`Release integrations complete: GA ${GA_ID}, robots/content metadata, canonical social identity, FAQ and SEO social metadata.`);
