CREATE TABLE IF NOT EXISTS sets (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  released_at TEXT,
  set_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_sets_released_at ON sets(released_at);
CREATE INDEX IF NOT EXISTS idx_sets_set_type ON sets(set_type);
