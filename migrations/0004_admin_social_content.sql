CREATE TABLE IF NOT EXISTS admin_social_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content_date TEXT NOT NULL,
  variant INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  posted_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
