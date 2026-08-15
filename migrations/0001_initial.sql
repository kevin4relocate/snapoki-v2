PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL CHECK (game IN ('maze','number-path','color-connect','lights-out','loop-puzzle')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  mode TEXT NOT NULL CHECK (mode IN ('normal','daily')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 5000),
  ranking_points INTEGER NOT NULL CHECK (ranking_points >= 0),
  time_ms INTEGER NOT NULL CHECK (time_ms >= 0),
  hints_used INTEGER NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  solution_used INTEGER NOT NULL DEFAULT 0 CHECK (solution_used IN (0,1)),
  played_date TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_results_game_points ON results(game, ranking_points DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_results_user_game ON results(user_id, game, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_game_date ON results(game, played_date, difficulty);
