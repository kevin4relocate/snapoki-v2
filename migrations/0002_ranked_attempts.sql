PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ranked_attempts (
  run_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  mode TEXT NOT NULL CHECK (mode IN ('normal','daily')),
  seed TEXT NOT NULL,
  started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ranked_attempts_user ON ranked_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ranked_attempts_expiry ON ranked_attempts(expires_at);
CREATE INDEX IF NOT EXISTS idx_ranked_attempts_seed ON ranked_attempts(user_id, game, difficulty, mode, seed);
