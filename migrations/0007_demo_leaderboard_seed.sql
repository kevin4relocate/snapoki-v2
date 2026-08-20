-- Fictional demo accounts for the public leaderboard.
-- These are not real accounts and do not create sessions or gameplay history.
-- They use the same bounded one-row-per-user/game model as real players.

INSERT OR IGNORE INTO users (google_sub,email,display_name,avatar_url) VALUES
  ('demo:pixel-fox','pixel-fox@demo.snapoki.local','PixelFox',NULL),
  ('demo:logic-nova','logic-nova@demo.snapoki.local','LogicNova',NULL),
  ('demo:maze-runner','maze-runner@demo.snapoki.local','MazeRunner',NULL),
  ('demo:brain-spark','brain-spark@demo.snapoki.local','BrainSpark',NULL),
  ('demo:puzzle-pilot','puzzle-pilot@demo.snapoki.local','PuzzlePilot',NULL),
  ('demo:grid-master','grid-master@demo.snapoki.local','GridMaster',NULL),
  ('demo:quick-think','quick-think@demo.snapoki.local','QuickThink',NULL),
  ('demo:path-finder','path-finder@demo.snapoki.local','PathFinder',NULL),
  ('demo:loop-hero','loop-hero@demo.snapoki.local','LoopHero',NULL),
  ('demo:casual-kai','casual-kai@demo.snapoki.local','CasualKai',NULL);

WITH demo(user_key,base_runs,base_xp,base_rank,user_order) AS (
  VALUES
    ('pixel-fox',9,210,1200,1),
    ('logic-nova',8,190,1150,2),
    ('maze-runner',7,180,1100,3),
    ('brain-spark',6,165,1020,4),
    ('puzzle-pilot',5,150,950,5),
    ('grid-master',4,140,900,6),
    ('quick-think',4,125,850,7),
    ('path-finder',3,115,780,8),
    ('loop-hero',3,105,720,9),
    ('casual-kai',2,90,650,10)
),
games(game,game_order) AS (
  VALUES
    ('echo-step',0),
    ('maze',1),
    ('number-path',2),
    ('color-connect',3),
    ('lights-out',4),
    ('loop-puzzle',5),
    ('bridges',6)
),
prepared AS (
  SELECT
    u.id AS user_id,
    g.game,
    MAX(1,d.base_runs-g.game_order) AS games_completed,
    MAX(20,d.base_xp-(g.game_order*5)) AS xp,
    MAX(300,d.base_rank-(g.game_order*45)) AS overall_rank_score,
    MIN(4950,MAX(300,d.base_rank-(g.game_order*45))+2500) AS overall_best_score,
    20000+(g.game_order*1500)+(d.user_order*350) AS overall_best_time_ms
  FROM demo d
  JOIN users u ON u.google_sub='demo:'||d.user_key
  CROSS JOIN games g
  GROUP BY u.id,g.game,d.base_runs,d.base_xp,d.base_rank,d.user_order,g.game_order
)
INSERT INTO user_game_stats (
  user_id,game,
  overall_rank_score,overall_best_score,overall_best_time_ms,overall_best_difficulty,
  games_completed,easy_clears,medium_clears,hard_clears,xp,
  updated_at
)
SELECT
  user_id,
  game,
  overall_rank_score,
  overall_best_score,
  overall_best_time_ms,
  CASE
    WHEN games_completed-(games_completed+2)/3-(games_completed+1)/3>0 THEN 'hard'
    WHEN (games_completed+1)/3>0 THEN 'medium'
    ELSE 'easy'
  END,
  games_completed,
  (games_completed+2)/3,
  (games_completed+1)/3,
  games_completed-(games_completed+2)/3-(games_completed+1)/3,
  xp,
  CURRENT_TIMESTAMP
FROM prepared
WHERE 1=1
ON CONFLICT(user_id,game) DO UPDATE SET
  overall_rank_score=excluded.overall_rank_score,
  overall_best_score=excluded.overall_best_score,
  overall_best_time_ms=excluded.overall_best_time_ms,
  overall_best_difficulty=excluded.overall_best_difficulty,
  games_completed=excluded.games_completed,
  easy_clears=excluded.easy_clears,
  medium_clears=excluded.medium_clears,
  hard_clears=excluded.hard_clears,
  xp=excluded.xp,
  updated_at=CURRENT_TIMESTAMP;
