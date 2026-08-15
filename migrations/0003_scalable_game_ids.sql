PRAGMA foreign_keys = OFF;

ALTER TABLE results RENAME TO results_legacy_v2;

CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
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

INSERT INTO results (id, run_id, user_id, game, difficulty, mode, score, ranking_points, time_ms, hints_used, solution_used, played_date, metadata_json, created_at)
SELECT id, run_id, user_id, game, difficulty, mode, score, ranking_points, time_ms, hints_used, solution_used, played_date, metadata_json, created_at
FROM results_legacy_v2;

DROP TABLE results_legacy_v2;

CREATE INDEX IF NOT EXISTS idx_results_game_points ON results(game, ranking_points DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_results_user_game ON results(user_id, game, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_game_date ON results(game, played_date, difficulty);

PRAGMA foreign_keys = ON;
