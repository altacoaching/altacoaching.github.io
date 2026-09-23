-- ALTA Google Reviews cost guard
-- Execute once in the Cloudflare D1 database bound as REVIEWS_GUARD.

CREATE TABLE IF NOT EXISTS google_reviews_guard (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  day_key TEXT NOT NULL,
  day_count INTEGER NOT NULL DEFAULT 0 CHECK (day_count >= 0),
  month_key TEXT NOT NULL,
  month_count INTEGER NOT NULL DEFAULT 0 CHECK (month_count >= 0),
  updated_at TEXT NOT NULL
);
