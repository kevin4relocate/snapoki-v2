PRAGMA foreign_keys = ON;

-- Global leaderboard totals stay on the existing one-row-per-user account record.
-- This avoids scanning every user_game_stats row when the public leaderboard is viewed.
ALTER TABLE users ADD COLUMN career_xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN career_runs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN mastery_score INTEGER NOT NULL DEFAULT 0;

-- Backfill from the bounded user + game stats table.
UPDATE users
SET
  career_xp=COALESCE((SELECT SUM(xp) FROM user_game_stats WHERE user_id=users.id),0),
  career_runs=COALESCE((SELECT SUM(games_completed) FROM user_game_stats WHERE user_id=users.id),0),
  mastery_score=COALESCE((SELECT SUM(overall_rank_score) FROM user_game_stats WHERE user_id=users.id),0);

CREATE INDEX IF NOT EXISTS idx_users_career_leaderboard
  ON users(career_xp DESC, career_runs DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_users_skill_leaderboard
  ON users(mastery_score DESC, career_runs DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_users_runs_leaderboard
  ON users(career_runs DESC, career_xp DESC, id ASC);

-- Keep the totals synchronized automatically whenever bounded game stats change.
CREATE TRIGGER IF NOT EXISTS trg_user_game_stats_leaderboard_insert
AFTER INSERT ON user_game_stats
BEGIN
  UPDATE users
  SET career_xp=career_xp+NEW.xp,
      career_runs=career_runs+NEW.games_completed,
      mastery_score=mastery_score+NEW.overall_rank_score,
      updated_at=CURRENT_TIMESTAMP
  WHERE id=NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_game_stats_leaderboard_update
AFTER UPDATE ON user_game_stats
BEGIN
  UPDATE users
  SET career_xp=career_xp+(NEW.xp-OLD.xp),
      career_runs=career_runs+(NEW.games_completed-OLD.games_completed),
      mastery_score=mastery_score+(NEW.overall_rank_score-OLD.overall_rank_score),
      updated_at=CURRENT_TIMESTAMP
  WHERE id=NEW.user_id;
END;

-- `user_game_stats` is the durable game-state source of truth; the account totals are
-- only the indexed aggregate used to serve the global leaderboard efficiently.
