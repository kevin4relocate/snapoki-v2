import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const auth=fs.readFileSync('functions/api/auth/google.js','utf8');

test('public Google login endpoint is disabled',()=>{
  assert.match(auth,/ACCOUNTS_DISABLED/);
  assert.doesNotMatch(auth,/INSERT INTO sessions|SESSION_CLEANUP_BATCH|oauth2\.googleapis/);
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
