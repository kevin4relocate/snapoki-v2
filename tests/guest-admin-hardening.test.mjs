import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requireAdmin} from '../functions/_lib/admin.js';
import {onRequest as googleSignIn} from '../functions/api/auth/google.js';
import {getGame} from '../src/js/games-config.js';

const post=(headers={})=>new Request('https://snapoki.com/api/snapdesk-74kq/content',{method:'POST',headers});
test('Content Desk rejects admin writes without a verified same-origin Origin header',async()=>{
  for(const headers of [{},{origin:'https://attacker.example'},{'sec-fetch-site':'cross-site',origin:'https://snapoki.com'}]){
    const response=await requireAdmin(post(headers),{});
    assert.equal(response.ok,false);
    assert.equal(response.response.status,403);
  }
});
test('same-origin admin writes pass CSRF gate and continue to auth configuration',async()=>{
  const response=await requireAdmin(post({origin:'https://snapoki.com'}),{});
  assert.equal(response.response.status,503);
});
test('Google admin login rejects missing or foreign origins before token processing',async()=>{
  for(const headers of [{},{origin:'https://attacker.example'}]){
    const response=await googleSignIn({request:new Request('https://snapoki.com/api/auth/google',{method:'POST',headers,body:'{}'}),env:{}});
    assert.equal(response.status,403);
    assert.equal((await response.json()).code,'CROSS_SITE_BLOCKED');
  }
});
test('public Maze SEO does not advertise retired Rankings feature',()=>{
  const maze=getGame('maze');
  assert.doesNotMatch(maze.seoTitle+' '+maze.seoDescription,/rankings|leaderboard/i);
});
test('Cloudflare static asset caching revalidates unchanged asset paths',()=>{
  const headers=readFileSync('public/_headers','utf8');
  assert.match(headers,/\/assets\/js\/\*\n\s+Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers,/\/assets\/styles\/\*\n\s+Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers,/Strict-Transport-Security: max-age=31536000/);
});
