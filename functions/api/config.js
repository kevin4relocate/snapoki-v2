import {json} from '../_lib/http.js';

export async function onRequestGet() {
  return json({accountsEnabled: false, googleClientId: ''});
}
