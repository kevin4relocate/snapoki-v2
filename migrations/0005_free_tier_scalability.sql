PRAGMA foreign_keys = ON;

-- D1 Free-Tier Scalability V1
-- Durable player state is bounded to one row per user + game.
CREATE TABLE IF NOT EXISTS user_game_stats (
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,

  overall_rank_score INTEGER NOT NULL DEFAULT 0,
  overall_best_score INTEGER NOT NULL DEFAULT 0,
  overall_best_time_ms INTEGER,
  overall_best_difficulty TEXT CHECK (overall_best_difficulty IS NULL OR overall_best_difficulty IN ('easy','medium','hard')),
  overall_achieved_at TEXT,

  easy_rank_score INTEGER NOT NULL DEFAULT 0,
  easy_best_score INTEGER NOT NULL DEFAULT 0,
  easy_best_time_ms INTEGER,
  easy_achieved_at TEXT,

  medium_rank_score INTEGER NOT NULL DEFAULT 0,
  medium_best_score INTEGER NOT NULL DEFAULT 0,
  medium_best_time_ms INTEGER,
  medium_achieved_at TEXT,

  hard_rank_score INTEGER NOT NULL DEFAULT 0,
  hard_best_score INTEGER NOT NULL DEFAULT 0,
  hard_best_time_ms INTEGER,
  hard_achieved_at TEXT,

  games_completed INTEGER NOT NULL DEFAULT 0,
  easy_clears INTEGER NOT NULL DEFAULT 0,
  medium_clears INTEGER NOT NULL DEFAULT 0,
  hard_clears INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,

  daily_date TEXT,
  daily_complete_mask INTEGER NOT NULL DEFAULT 0 CHECK (daily_complete_mask BETWEEN 0 AND 7),
  daily_blocked_mask INTEGER NOT NULL DEFAULT 0 CHECK (daily_blocked_mask BETWEEN 0 AND 7),
  daily_streak INTEGER NOT NULL DEFAULT 0,
  longest_daily_streak INTEGER NOT NULL DEFAULT 0,
  last_daily_complete_date TEXT,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, game),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_overall
  ON user_game_stats(game, overall_rank_score DESC, overall_best_score DESC, overall_best_time_ms ASC, overall_achieved_at ASC);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_easy
  ON user_game_stats(game, easy_rank_score DESC, easy_best_score DESC, easy_best_time_ms ASC, easy_achieved_at ASC);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_medium
  ON user_game_stats(game, medium_rank_score DESC, medium_best_score DESC, medium_best_time_ms ASC, medium_achieved_at ASC);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_hard
  ON user_game_stats(game, hard_rank_score DESC, hard_best_score DESC, hard_best_time_ms ASC, hard_achieved_at ASC);

-- Backfill bounded progression from legacy immutable results.
INSERT INTO user_game_stats (
  user_id, game, games_completed, easy_clears, medium_clears, hard_clears, xp, updated_at
)
SELECT
  user_id,
  game,
  COUNT(*) AS games_completed,
  SUM(CASE WHEN difficulty='easy' THEN 1 ELSE 0 END) AS easy_clears,
  SUM(CASE WHEN difficulty='medium' THEN 1 ELSE 0 END) AS medium_clears,
  SUM(CASE WHEN difficulty='hard' THEN 1 ELSE 0 END) AS hard_clears,
  SUM(CASE difficulty WHEN 'hard' THEN 90 WHEN 'medium' THEN 55 ELSE 30 END) AS xp,
  CURRENT_TIMESTAMP
FROM results
WHERE solution_used=0
GROUP BY user_id, game
ON CONFLICT(user_id, game) DO UPDATE SET
  games_completed=excluded.games_completed,
  easy_clears=excluded.easy_clears,
  medium_clears=excluded.medium_clears,
  hard_clears=excluded.hard_clears,
  xp=excluded.xp,
  updated_at=CURRENT_TIMESTAMP;

-- Backfill one PB per difficulty from Regular Play only.
WITH ranked AS (
  SELECT
    user_id, game, difficulty, ranking_points, score, time_ms, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, game, difficulty
      ORDER BY ranking_points DESC, score DESC, time_ms ASC, created_at ASC, id ASC
    ) AS rn
  FROM results
  WHERE mode='normal' AND solution_used=0 AND ranking_points>0
)
INSERT INTO user_game_stats (
  user_id, game,
  easy_rank_score, easy_best_score, easy_best_time_ms, easy_achieved_at,
  updated_at
)
SELECT user_id, game, ranking_points, score, time_ms, created_at, CURRENT_TIMESTAMP
FROM ranked
WHERE difficulty='easy' AND rn=1
ON CONFLICT(user_id, game) DO UPDATE SET
  easy_rank_score=excluded.easy_rank_score,
  easy_best_score=excluded.easy_best_score,
  easy_best_time_ms=excluded.easy_best_time_ms,
  easy_achieved_at=excluded.easy_achieved_at,
  updated_at=CURRENT_TIMESTAMP;

WITH ranked AS (
  SELECT
    user_id, game, difficulty, ranking_points, score, time_ms, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, game, difficulty
      ORDER BY ranking_points DESC, score DESC, time_ms ASC, created_at ASC, id ASC
    ) AS rn
  FROM results
  WHERE mode='normal' AND solution_used=0 AND ranking_points>0
)
INSERT INTO user_game_stats (
  user_id, game,
  medium_rank_score, medium_best_score, medium_best_time_ms, medium_achieved_at,
  updated_at
)
SELECT user_id, game, ranking_points, score, time_ms, created_at, CURRENT_TIMESTAMP
FROM ranked
WHERE difficulty='medium' AND rn=1
ON CONFLICT(user_id, game) DO UPDATE SET
  medium_rank_score=excluded.medium_rank_score,
  medium_best_score=excluded.medium_best_score,
  medium_best_time_ms=excluded.medium_best_time_ms,
  medium_achieved_at=excluded.medium_achieved_at,
  updated_at=CURRENT_TIMESTAMP;

WITH ranked AS (
  SELECT
    user_id, game, difficulty, ranking_points, score, time_ms, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, game, difficulty
      ORDER BY ranking_points DESC, score DESC, time_ms ASC, created_at ASC, id ASC
    ) AS rn
  FROM results
  WHERE mode='normal' AND solution_used=0 AND ranking_points>0
)
INSERT INTO user_game_stats (
  user_id, game,
  hard_rank_score, hard_best_score, hard_best_time_ms, hard_achieved_at,
  updated_at
)
SELECT user_id, game, ranking_points, score, time_ms, created_at, CURRENT_TIMESTAMP
FROM ranked
WHERE difficulty='hard' AND rn=1
ON CONFLICT(user_id, game) DO UPDATE SET
  hard_rank_score=excluded.hard_rank_score,
  hard_best_score=excluded.hard_best_score,
  hard_best_time_ms=excluded.hard_best_time_ms,
  hard_achieved_at=excluded.hard_achieved_at,
  updated_at=CURRENT_TIMESTAMP;

-- Backfill the single Overall PB from the strongest Regular Play finish.
WITH ranked AS (
  SELECT
    user_id, game, difficulty, ranking_points, score, time_ms, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, game
      ORDER BY ranking_points DESC, score DESC, time_ms ASC, created_at ASC, id ASC
    ) AS rn
  FROM results
  WHERE mode='normal' AND solution_used=0 AND ranking_points>0
)
INSERT INTO user_game_stats (
  user_id, game,
  overall_rank_score, overall_best_score, overall_best_time_ms,
  overall_best_difficulty, overall_achieved_at, updated_at
)
SELECT
  user_id, game, ranking_points, score, time_ms,
  difficulty, created_at, CURRENT_TIMESTAMP
FROM ranked
WHERE rn=1
ON CONFLICT(user_id, game) DO UPDATE SET
  overall_rank_score=excluded.overall_rank_score,
  overall_best_score=excluded.overall_best_score,
  overall_best_time_ms=excluded.overall_best_time_ms,
  overall_best_difficulty=excluded.overall_best_difficulty,
  overall_achieved_at=excluded.overall_achieved_at,
  updated_at=CURRENT_TIMESTAMP;

-- Preserve today's compact Daily state.
WITH today AS (
  SELECT
    user_id,
    game,
    MAX(CASE WHEN difficulty='easy' AND solution_used=0 AND ranking_points>0 THEN 1 ELSE 0 END)
      + MAX(CASE WHEN difficulty='medium' AND solution_used=0 AND ranking_points>0 THEN 2 ELSE 0 END)
      + MAX(CASE WHEN difficulty='hard' AND solution_used=0 AND ranking_points>0 THEN 4 ELSE 0 END) AS complete_mask,
    MAX(CASE WHEN difficulty='easy' AND solution_used=1 THEN 1 ELSE 0 END)
      + MAX(CASE WHEN difficulty='medium' AND solution_used=1 THEN 2 ELSE 0 END)
      + MAX(CASE WHEN difficulty='hard' AND solution_used=1 THEN 4 ELSE 0 END) AS blocked_mask
  FROM results
  WHERE mode='daily' AND played_date=date('now')
  GROUP BY user_id, game
)
INSERT INTO user_game_stats (
  user_id, game, daily_date, daily_complete_mask, daily_blocked_mask, updated_at
)
SELECT user_id, game, date('now'), complete_mask, blocked_mask, CURRENT_TIMESTAMP
FROM today
WHERE 1=1
ON CONFLICT(user_id, game) DO UPDATE SET
  daily_date=excluded.daily_date,
  daily_complete_mask=excluded.daily_complete_mask,
  daily_blocked_mask=excluded.daily_blocked_mask,
  updated_at=CURRENT_TIMESTAMP;

-- Preserve current + longest Daily streak without keeping one row per historical day.
WITH daily_days AS (
  SELECT user_id, game, played_date
  FROM results
  WHERE mode='daily' AND solution_used=0 AND ranking_points>0
  GROUP BY user_id, game, played_date
  HAVING COUNT(DISTINCT difficulty)=3
),
numbered AS (
  SELECT
    user_id, game, played_date,
    ROW_NUMBER() OVER (PARTITION BY user_id, game ORDER BY played_date) AS rn
  FROM daily_days
),
runs AS (
  SELECT
    user_id, game,
    MIN(played_date) AS start_date,
    MAX(played_date) AS end_date,
    COUNT(*) AS run_length
  FROM numbered
  GROUP BY user_id, game, CAST(julianday(played_date) AS INTEGER)-rn
),
summary AS (
  SELECT
    user_id,
    game,
    MAX(run_length) AS longest_streak,
    MAX(CASE WHEN end_date IN (date('now'),date('now','-1 day')) THEN run_length ELSE 0 END) AS current_streak,
    MAX(end_date) AS last_complete_date
  FROM runs
  GROUP BY user_id, game
)
UPDATE user_game_stats
SET
  daily_streak=COALESCE((SELECT current_streak FROM summary s WHERE s.user_id=user_game_stats.user_id AND s.game=user_game_stats.game),0),
  longest_daily_streak=COALESCE((SELECT longest_streak FROM summary s WHERE s.user_id=user_game_stats.user_id AND s.game=user_game_stats.game),0),
  last_daily_complete_date=(SELECT last_complete_date FROM summary s WHERE s.user_id=user_game_stats.user_id AND s.game=user_game_stats.game)
WHERE EXISTS (
  SELECT 1 FROM summary s WHERE s.user_id=user_game_stats.user_id AND s.game=user_game_stats.game
);

-- Ranked attempts become bounded slots: at most one row per user/game/difficulty/mode.
-- Existing attempts are ephemeral; keep only the newest slot before enforcing uniqueness.
DELETE FROM ranked_attempts
WHERE rowid NOT IN (
  SELECT MAX(rowid)
  FROM ranked_attempts
  GROUP BY user_id, game, difficulty, mode
);

ALTER TABLE ranked_attempts ADD COLUMN solution_revealed INTEGER NOT NULL DEFAULT 0 CHECK (solution_revealed IN (0,1));
ALTER TABLE ranked_attempts ADD COLUMN completed_score INTEGER;
ALTER TABLE ranked_attempts ADD COLUMN completed_rank_score INTEGER;
ALTER TABLE ranked_attempts ADD COLUMN completed_time_ms INTEGER;
ALTER TABLE ranked_attempts ADD COLUMN completed_at TEXT;

DROP INDEX IF EXISTS idx_ranked_attempts_user;
DROP INDEX IF EXISTS idx_ranked_attempts_expiry;
DROP INDEX IF EXISTS idx_ranked_attempts_seed;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ranked_attempts_slot
  ON ranked_attempts(user_id, game, difficulty, mode);

-- `results` intentionally remains as a read-only legacy archive for rollback/audit.
-- New application code does not insert into it; it can be dropped in a later migration
-- after the preview and production migration have been observed safely.
