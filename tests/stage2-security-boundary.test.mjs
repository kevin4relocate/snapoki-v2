import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {onRequest as routeGuard} from '../functions/_middleware.js';
import {requireAdmin} from '../functions/_lib/admin.js';
import {getSession} from '../functions/_lib/auth.js';
import {onRequest as logout} from '../functions/api/logout.js';
import {onRequestGet as identity} from '../functions/api/me.js';

const origin='https://snapoki.com';
const request=(path,options={})=>new Request(origin+path,options);
const context=(path,options={})=>{
  let touched=false;
  return {ctx:{request:request(path,options),next:()=>{touched=true;return new Response('next')}},touched:()=>touched};
};

test('legacy gameplay endpoints fail closed without invoking handlers',async()=>{
  for(const route of ['/api/profile','/api/rankings','/api/global-rankings','/api/results','/api/runs/start','/api/runs/reveal']){
    for(const method of ['GET','POST']){
      const {ctx,touched}=context(route,{method});
      const response=await routeGuard(ctx);
      assert.equal(response.status,410,route);
      assert.equal((await response.json()).code,'FEATURE_RETIRED');
      assert.equal(response.headers.get('cache-control'),'no-store');
      assert.equal(touched(),false);
    }
  }
});
test('unknown API routes cannot silently expose newly added legacy handlers',async()=>{
  for(const route of ['/api/new-player-registration','/api/runs/hidden','/api/admin','/api/snapdesk-74kq/debug']){
    const {ctx,touched}=context(route);
    const response=await routeGuard(ctx);
    assert.equal(response.status,404,route);
    assert.equal((await response.json()).code,'API_NOT_FOUND');
    assert.equal(touched(),false);
  }
});
test('only explicit private-admin and disabled-config routes reach the router',async()=>{
  for(const route of ['/api/auth/google','/api/logout','/api/me','/api/config','/api/snapdesk-74kq/auth-config','/api/snapdesk-74kq/content']){
    const {ctx,touched}=context(route);
    assert.equal((await routeGuard(ctx)).status,200);
    assert.equal(touched(),true);
  }
});
test('Content Desk rejects same-site subdomains and cross-site GET requests',async()=>{
  for(const fetchSite of ['cross-site','same-site']){
    const response=await requireAdmin(request('/api/snapdesk-74kq/content',{headers:{'sec-fetch-site':fetchSite}}),{});
    assert.equal(response.ok,false);
    assert.equal(response.response.status,403);
  }
});
test('Content Desk still fails safely when admin is not configured',async()=>{
  const result=await requireAdmin(request('/api/snapdesk-74kq/content',{headers:{'sec-fetch-site':'same-origin'}}),{});
  assert.equal(result.response.status,503);
});
test('malformed or oversized cookies never query the admin session database',async()=>{
  for(const cookie of [
    'snapoki_session=%ZZ',
    'snapoki_session=abc',
    'snapoki_session='+('a'.repeat(4096)),
    'snapoki_session=__proto__'
  ]){
    const session=await getSession(request('/api/me',{headers:{cookie}}),{
      DB:{prepare(){throw new Error('Malformed token reached D1');}}
    });
    assert.equal(session,null);
  }
});
test('admin identity is no longer exposed to guest or legacy player sessions',async()=>{
  const response=await identity({
    request:request('/api/me'),
    env:{ADMIN_EMAIL:'admin@example.com',DB:{prepare(){throw new Error('Anonymous identity accessed DB');}}}
  });
  assert.equal(response.status,401);
});
test('logout rejects cross-origin and missing-origin requests',async()=>{
  for(const headers of [{},{origin:'https://other.example'},{origin,'sec-fetch-site':'same-site'}]){
    const response=await logout({request:request('/api/logout',{method:'POST',headers}),env:{}});
    assert.equal(response.status,403);
    assert.equal((await response.json()).code,'CROSS_SITE_BLOCKED');
  }
});
test('same-origin logout still clears the admin cookie',async()=>{
  const response=await logout({request:request('/api/logout',{method:'POST',headers:{origin}}),env:{}});
  assert.equal(response.status,200);
  assert.match(response.headers.get('set-cookie')||'',/snapoki_session=;.*Max-Age=0/);
});
test('public build excludes retired player entry points but preserves Content Desk',()=>{
  for(const path of [
    'dist/assets/js/api.js',
    'dist/assets/js/profile-page.js',
    'dist/assets/js/global-leaderboard.js',
    'dist/assets/styles/account-profile.css',
    'dist/assets/styles/global-leaderboard.css'
  ])assert.equal(existsSync(path),false,path);
  for(const path of [
    'dist/assets/js/admin-content.js',
    'dist/assets/styles/admin.css',
    'dist/snapdesk-74kq/index.html'
  ])assert.equal(existsSync(path),true,path);
});
