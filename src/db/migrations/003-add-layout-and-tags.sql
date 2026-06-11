ALTER TABLE cards ADD COLUMN layout TEXT;

CREATE TABLE IF NOT EXISTS card_tags (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (card_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_card_tags_tag ON card_tags(tag);
