import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/_middleware.js';

const retired=['/api/profile','/api/rankings','/api/global-rankings','/api/results','/api/runs/start','/api/runs/reveal'];

for(const path of retired){
  test(`retired public player endpoint ${path} returns 410 without reaching D1`,async()=>{
    let nextCalled=false;
    const response=await onRequest({
      request:new Request('https://snapoki.com'+path),
      next(){nextCalled=true;return new Response('should not reach');}
    });
    assert.equal(response.status,410);
    assert.equal((await response.json()).code,'FEATURE_RETIRED');
    assert.equal(nextCalled,false);
    assert.equal(response.headers.get('cache-control'),'no-store');
  });
}
for(const path of ['/api/auth/google','/api/snapdesk-74kq/content','/api/snapdesk-74kq/auth-config','/api/me','/api/logout']){
  test(`admin session route ${path} stays available`,async()=>{
    let nextCalled=false;
    const response=await onRequest({
      request:new Request('https://snapoki.com'+path),
      next(){nextCalled=true;return new Response('admin route allowed');}
    });
    assert.equal(nextCalled,true);
    assert.equal(await response.text(),'admin route allowed');
  });
}
