-- Migration: Add oracle tags support
-- Description: Create oracle_tags and oracle_taggings tables for Scryfall community tag data

CREATE TABLE IF NOT EXISTS oracle_tags (
  tag_id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  parent_id TEXT REFERENCES oracle_tags(tag_id),
  description TEXT,
  cached_descendants_json TEXT
);

CREATE TABLE IF NOT EXISTS oracle_taggings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oracle_id TEXT NOT NULL,
  tag_id TEXT NOT NULL REFERENCES oracle_tags(tag_id) ON DELETE CASCADE,
  weight TEXT CHECK(weight IN ('very_strong', 'strong', 'median', 'weak')) NOT NULL DEFAULT 'median',
  annotation TEXT,
  UNIQUE(oracle_id, tag_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_oracle_taggings_oracle_id ON oracle_taggings(oracle_id);
CREATE INDEX IF NOT EXISTS idx_oracle_taggings_tag_id ON oracle_taggings(tag_id);
CREATE INDEX IF NOT EXISTS idx_oracle_tags_parent ON oracle_tags(parent_id);
