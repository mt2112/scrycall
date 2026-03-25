CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  oracle_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mana_cost TEXT,
  cmc REAL NOT NULL DEFAULT 0,
  type_line TEXT NOT NULL DEFAULT '',
  oracle_text TEXT,
  power TEXT,
  toughness TEXT,
  set_code TEXT NOT NULL,
  set_name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  loyalty TEXT
);

CREATE TABLE IF NOT EXISTS card_colors (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('W', 'U', 'B', 'R', 'G')),
  PRIMARY KEY (card_id, color)
);

CREATE TABLE IF NOT EXISTS card_color_identity (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('W', 'U', 'B', 'R', 'G')),
  PRIMARY KEY (card_id, color)
);

CREATE TABLE IF NOT EXISTS card_keywords (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  PRIMARY KEY (card_id, keyword)
);

CREATE TABLE IF NOT EXISTS card_legalities (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (card_id, format)
);

CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  name,
  oracle_text,
  type_line,
  content='cards',
  content_rowid='rowid'
);

-- Triggers to keep FTS5 in sync with cards table
CREATE TRIGGER IF NOT EXISTS cards_fts_insert AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(rowid, name, oracle_text, type_line)
  VALUES (new.rowid, new.name, new.oracle_text, new.type_line);
END;

CREATE TRIGGER IF NOT EXISTS cards_fts_delete AFTER DELETE ON cards BEGIN
  INSERT INTO cards_fts(cards_fts, rowid, name, oracle_text, type_line)
  VALUES ('delete', old.rowid, old.name, old.oracle_text, old.type_line);
END;

CREATE TRIGGER IF NOT EXISTS cards_fts_update AFTER UPDATE ON cards BEGIN
  INSERT INTO cards_fts(cards_fts, rowid, name, oracle_text, type_line)
  VALUES ('delete', old.rowid, old.name, old.oracle_text, old.type_line);
  INSERT INTO cards_fts(rowid, name, oracle_text, type_line)
  VALUES (new.rowid, new.name, new.oracle_text, new.type_line);
END;

CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id);
CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
CREATE INDEX IF NOT EXISTS idx_card_colors_color ON card_colors(color);
CREATE INDEX IF NOT EXISTS idx_card_color_identity_color ON card_color_identity(color);
CREATE INDEX IF NOT EXISTS idx_card_keywords_keyword ON card_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_card_legalities_format ON card_legalities(format, status);
