import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const auth=fs.readFileSync('functions/api/auth/google.js','utf8');

test('Google login uses indexed bounded session cleanup instead of an unbounded expiry delete',()=>{
  assert.match(auth,/SESSION_CLEANUP_BATCH\s*=\s*24/);
  assert.match(auth,/WHERE expires_at <= \?/);
  assert.match(auth,/ORDER BY expires_at ASC/);
  assert.match(auth,/LIMIT \?/);
  assert.doesNotMatch(auth,/DELETE FROM sessions WHERE datetime\(expires_at\) <= datetime\('now'\)/);
});

test('bounded session cleanup removes at most one small batch and preserves active sessions',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
  `);
  const insert=db.prepare('INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)');
  for(let i=0;i<40;i++)insert.run(`expired-${i}`,1,`2000-01-${String((i%28)+1).padStart(2,'0')}T00:00:00.000Z`);
  for(let i=0;i<5;i++)insert.run(`active-${i}`,1,'2099-01-01T00:00:00.000Z');

  db.prepare(`
    DELETE FROM sessions
    WHERE id IN (
      SELECT id FROM sessions
      WHERE expires_at <= ?
      ORDER BY expires_at ASC
      LIMIT ?
    )
  `).run(new Date().toISOString(),24);

  assert.equal(Number(db.prepare(`SELECT COUNT(*) AS count FROM sessions WHERE id LIKE 'expired-%'`).get().count),16);
  assert.equal(Number(db.prepare(`SELECT COUNT(*) AS count FROM sessions WHERE id LIKE 'active-%'`).get().count),5);
  db.close();
});
