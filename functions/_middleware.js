// Retire account-bound gameplay endpoints at the routing boundary while retaining
// the private Content Desk's Google admin session and D1 compatibility tables.
const RETIRED_PATHS=new Set([
  '/api/profile',
  '/api/rankings',
  '/api/global-rankings',
  '/api/results',
  '/api/runs/start',
  '/api/runs/reveal'
]);

export async function onRequest(context){
  const pathname=new URL(context.request.url).pathname.replace(/\/$/,'');
  if(RETIRED_PATHS.has(pathname)){
    return new Response(JSON.stringify({error:'This player feature has been retired.',code:'FEATURE_RETIRED'}),{
      status:410,
      headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
    });
  }
  return context.next();
}
