import {error,methodNotAllowed} from '../../_lib/http.js';

export async function onRequest({request}) {
  if(request.method!=='POST')return methodNotAllowed();
  return error('Accounts are not available on Snapoki.',404,'ACCOUNTS_DISABLED');
}
