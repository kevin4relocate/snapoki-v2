// The guest-first public product exposes only the private Content Desk/admin API.
// Fail closed for old player endpoints, including on deployments that retain their code.
const ACTIVE_PATHS=new Set([
  '/api/auth/google',
  '/api/logout',
  '/api/me',
  '/api/config',
  '/api/snapdesk-74kq/auth-config',
  '/api/snapdesk-74kq/content'
]);
const RETIRED_PATHS=new Set([
  '/api/profile',
  '/api/rankings',
  '/api/global-rankings',
  '/api/results',
  '/api/runs/start',
  '/api/runs/reveal'
]);
function denied(status,code,message){
  return new Response(JSON.stringify({error:message,code}),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
  });
}
export async function onRequest(context){
  const pathname=new URL(context.request.url).pathname.replace(/\/$/,'');
  if(RETIRED_PATHS.has(pathname))
    return denied(410,'FEATURE_RETIRED','This player feature has been retired.');
  if(!ACTIVE_PATHS.has(pathname))
    return denied(404,'API_NOT_FOUND','API endpoint not found.');
  return context.next();
}
