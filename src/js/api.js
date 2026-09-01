if(typeof document!=='undefined'&&!document.querySelector('link[data-snapoki-platform-v2]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/styles/platform-v2.css';link.dataset.snapokiPlatformV2='1';document.head.appendChild(link);}
export class ApiError extends Error {constructor(message,status=0,code=''){super(message);this.name='ApiError';this.status=status;this.code=code;}}
export async function api(path,options={}){const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}}),type=response.headers.get('content-type')||'',data=type.includes('application/json')?await response.json().catch(()=>({})):{};if(!response.ok)throw new ApiError(data.error||'Something went wrong. Please try again.',response.status,data.code||'');return data;}
let activeRankedAttempt=null,allowSyncedHintClick=false,hintSyncInflight=false;
export async function post(path,body={}){
  const data=await api(path,{method:'POST',body:JSON.stringify(body)});
  if(path==='/api/runs/start')activeRankedAttempt=data?.ranked!==false&&data?.run_id?{run_id:data.run_id,seed:data.seed||''}:null;
  else if((path==='/api/results'||path==='/api/runs/reveal')&&body?.run_id&&activeRankedAttempt?.run_id===body.run_id)activeRankedAttempt=null;
  return data;
}
export function makeRunId(game){const random=crypto.getRandomValues(new Uint32Array(4));return `${game}-${Date.now().toString(36)}-${Array.from(random,n=>n.toString(36)).join('')}`;}
export const RANKED_PREFETCH_BUDGET_MS=900;
const ATTEMPT_PREFIX='snapoki:ranked-attempt:v2:',attemptInflight=new Map();
function withinRankedStartBudget(promise,ms=RANKED_PREFETCH_BUDGET_MS){let timer;const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve(null),ms);});return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));}
export function attemptCacheKey(game,difficulty='easy',mode='normal'){return `${ATTEMPT_PREFIX}${game}:${difficulty}:${mode}`;}
export function cacheRankedAttempt(game,difficulty,mode,attempt){if(!attempt?.run_id||!attempt?.seed||attempt.ranked===false)return attempt;try{sessionStorage.setItem(attemptCacheKey(game,difficulty,mode),JSON.stringify(attempt));}catch{}return attempt;}
export function peekRankedAttempt(game,difficulty='easy',mode='normal'){try{const raw=sessionStorage.getItem(attemptCacheKey(game,difficulty,mode));if(!raw)return null;const data=JSON.parse(raw),expiry=Date.parse(data?.expires_at||'');if(!data?.run_id||!data?.seed||!Number.isFinite(expiry)||expiry-Date.now()<8000){sessionStorage.removeItem(attemptCacheKey(game,difficulty,mode));return null;}return data;}catch{return null;}}
export function consumeRankedAttempt(game,difficulty='easy',mode='normal'){const data=peekRankedAttempt(game,difficulty,mode);if(!data)return null;try{sessionStorage.removeItem(attemptCacheKey(game,difficulty,mode));}catch{}if(data?.run_id&&data.ranked!==false)activeRankedAttempt={run_id:data.run_id,seed:data.seed||''};return data;}
export async function prefetchRankedAttempt(game,difficulty='easy',mode='normal'){const cached=peekRankedAttempt(game,difficulty,mode);if(cached)return cached;const key=attemptCacheKey(game,difficulty,mode),existing=attemptInflight.get(key);if(existing)return withinRankedStartBudget(existing);const request=post('/api/runs/start',{game,difficulty,mode}).then(data=>cacheRankedAttempt(game,difficulty,mode,data)).finally(()=>attemptInflight.delete(key));attemptInflight.set(key,request);return withinRankedStartBudget(request);}

if(typeof document!=='undefined')document.addEventListener('click',async event=>{
  const button=event.target?.closest?.('#hint');
  if(!button||allowSyncedHintClick||!activeRankedAttempt?.run_id)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(hintSyncInflight)return;
  hintSyncInflight=true;button.disabled=true;
  try{
    await post('/api/runs/hint',{run_id:activeRankedAttempt.run_id});
    if(!button.isConnected)return;
    allowSyncedHintClick=true;button.disabled=false;button.click();allowSyncedHintClick=false;
  }catch(error){
    console.warn('Ranked Hint could not be recorded; Hint was not applied.',error);
  }finally{
    allowSyncedHintClick=false;hintSyncInflight=false;if(button.isConnected)button.disabled=false;
  }
},true);
