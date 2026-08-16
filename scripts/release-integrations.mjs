// Final post-build launch integrations: analytics, social identity, FAQ width/content and privacy disclosure.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const GA_ID='G-ED1P696TW8';
const LINKEDIN='https://www.linkedin.com/company/snapoki/';
const X_URL='https://x.com/snapoki_x';

const analytics=`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${GA_ID}');\n</script>`;
const social=`<div class="footer-social" aria-label="Snapoki social links"><a href="${LINKEDIN}" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on LinkedIn"><span class="social-glyph" aria-hidden="true">in</span><span>LinkedIn</span></a><a href="${X_URL}" target="_blank" rel="noopener noreferrer" aria-label="Snapoki on X"><span class="social-glyph social-glyph--x" aria-hidden="true">X</span><span>X</span></a></div>`;
const faq=`<section class="section faq"><div class="section-heading"><div><span class="eyebrow">FAQ</span><h2>Play without friction</h2></div></div><details><summary>Is Snapoki free?</summary><p>Yes. Every Snapoki puzzle can be played for free in a modern browser, with no download required.</p></details><details><summary>Do I need an account?</summary><p>No. Guest play is available immediately. Sign in with Google only if you want verified ranked results, Ranking Points and synced Daily progress.</p></details><details><summary>What is a Daily Challenge?</summary><p>Each game has one Easy, Medium and Hard Daily board for the current UTC date. Complete all three to finish that game’s Daily set. <a href="/daily-challenges/">Learn how Daily Challenges work.</a></p></details><details><summary>How does difficulty work?</summary><p>Difficulty changes the reasoning pressure, not just the board size. Depending on the game it can reduce clues, add blockers and bottlenecks, increase route decisions, deepen traps, or require a higher minimum number of logical moves.</p></details><details><summary>How do Rankings work?</summary><p>Signed-in ranked finishes are verified by the server before they count. Easy, Medium and Hard use ×1, ×3 and ×5 Ranking Point multipliers, while hints reduce the reward for that finish. <a href="/rankings-guide/">Read the Rankings & Fair Play guide.</a></p></details><details><summary>What happens when I use Solution?</summary><p>Solution shows a complete practice guide directly on the board. That attempt becomes practice-only and cannot be submitted to Rankings; start a New Puzzle to return to ranked play.</p></details></section>`;

async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out;}
function addAnalytics(html){if(html.includes(`googletagmanager.com/gtag/js?id=${GA_ID}`))return html;return html.replace('</head>',`${analytics}</head>`);}
function addSocial(html){if(html.includes('class="footer-social"'))return html;return html.replace(/(<div class="footer-brand">[\s\S]*?<p>[\s\S]*?<\/p>)/,`$1${social}`);}
function addSocialMeta(html){if(!html.includes('name="twitter:site"'))html=html.replace('</head>','<meta name="twitter:site" content="@snapoki_x"></head>');if(!html.includes('property="og:image:alt"'))html=html.replace('</head>','<meta property="og:image:alt" content="Snapoki puzzle games"><meta name="twitter:image:alt" content="Snapoki puzzle games"></head>');return html;}
function updateOrganization(html){return html.replace(/"email":"contact@snapoki\.com"/,`"sameAs":["${LINKEDIN}","${X_URL}"]`);}
function updatePrivacy(html){if(html.includes('<h2>Analytics</h2>'))return html;const analyticsSection='<h2>Analytics</h2><p>Snapoki uses Google Analytics to understand how the site is used, including information such as page visits, device and browser characteristics, approximate geography and interaction patterns. Google Analytics may use first-party cookies or similar identifiers for measurement. Analytics is not required to play Snapoki as a guest.</p>';html=html.replace('<h2>Cookies</h2>',`${analyticsSection}<h2>Cookies</h2>`);html=html.replace(/<h2>Cookies<\/h2><p>[\s\S]*?<\/p>/,`<h2>Cookies</h2><p>The core account cookie is used to maintain your signed-in session. Snapoki does not require an account cookie to let you play as a guest. Google Analytics may also use first-party cookies or similar identifiers to measure site usage. This policy should be updated if the analytics, advertising or consent setup changes materially.</p>`);return html;}

for(const file of (await walk(dist)).filter(file=>file.endsWith('.html'))){
  let html=await fs.readFile(file,'utf8');
  const isPrivateUtility=html.includes('data-private-utility="true"');
  if(!isPrivateUtility){html=addAnalytics(html);html=addSocial(html);html=addSocialMeta(html);}
  if(file===path.join(dist,'index.html')){html=html.replace(/<section class="section faq">[\s\S]*?<\/section>/,faq);html=updateOrganization(html);}
  if(file===path.join(dist,'privacy','index.html'))html=updatePrivacy(html);
  await fs.writeFile(file,html);
}

const launchFile=path.join(dist,'assets','styles','launch.css');let css=await fs.readFile(launchFile,'utf8');if(!css.includes('/* final release integrations */'))css+=`\n\n/* final release integrations */\n.home-page .faq{width:100%;max-width:calc(var(--content-max) + (var(--site-shell-gutter) * 2));margin-left:auto;margin-right:auto}\n.home-page .faq a{color:#68d9f6;text-decoration:none}.home-page .faq a:hover{color:#fff}\n.footer-social{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:18px}\n.footer-social a{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 11px;border:1px solid #27314a;border-radius:999px;color:#aab4ca;font-size:12px;font-weight:720;transition:border-color .16s ease,color .16s ease,background .16s ease}\n.footer-social a:hover{color:#fff;border-color:#4a5d86;background:#11182a}\n.social-glyph{width:18px;height:18px;border-radius:5px;display:inline-grid;place-items:center;background:#e8eefc;color:#0a0d16;font-size:10px;font-weight:900;line-height:1}.social-glyph--x{background:transparent;color:#e8eefc;border:1px solid #55617a;font-size:9px}\n`;
await fs.writeFile(launchFile,css);
console.log(`Release integrations complete: GA ${GA_ID}, social links, 1080px FAQ and SEO social metadata.`);
