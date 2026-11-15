import {json} from '../_lib/http.js';
import {requireAdmin} from '../_lib/admin.js';

// Legacy player identity is retired. Keep this endpoint private for admin tooling only.
export async function onRequestGet({request,env}){
  const permission=await requireAdmin(request,env);
  if(!permission.ok)return permission.response;
  return json({user:permission.session.user,admin:true});
}
