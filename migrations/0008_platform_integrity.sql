PRAGMA foreign_keys = ON;

-- Server-authoritative Hint usage stays on the bounded ranked attempt slot.
ALTER TABLE ranked_attempts ADD COLUMN hint_count INTEGER NOT NULL DEFAULT 0 CHECK (hint_count BETWEEN 0 AND 99);

-- Anti-farm volume tracking stays bounded on the existing account row.
-- The bucket is an ISO UTC hour (YYYY-MM-DDTHH); the counter resets when the hour changes.
ALTER TABLE users ADD COLUMN ranked_hour_bucket TEXT;
ALTER TABLE users ADD COLUMN ranked_hour_count INTEGER NOT NULL DEFAULT 0;
