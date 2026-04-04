import type Database from 'better-sqlite3';
import type { Card, Color, Rarity, FormatLegality, Legality } from '../models/index.js';

interface CardRow {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost: string | null;
  cmc: number;
  type_line: string;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  set_code: string;
  set_name: string;
  rarity: string;
  loyalty: string | null;
  scryfall_uri: string | null;
}

function getCardColors(db: Database.Database, cardId: string): readonly Color[] {
  const rows = db
    .prepare('SELECT color FROM card_colors WHERE card_id = ?')
    .all(cardId) as { color: string }[];
  return rows.map((r) => r.color as Color);
}

function getCardColorIdentity(db: Database.Database, cardId: string): readonly Color[] {
  const rows = db
    .prepare('SELECT color FROM card_color_identity WHERE card_id = ?')
    .all(cardId) as { color: string }[];
  return rows.map((r) => r.color as Color);
}

function getCardKeywords(db: Database.Database, cardId: string): readonly string[] {
  const rows = db
    .prepare('SELECT keyword FROM card_keywords WHERE card_id = ?')
    .all(cardId) as { keyword: string }[];
  return rows.map((r) => r.keyword);
}

function getCardLegalities(db: Database.Database, cardId: string): FormatLegality {
  const rows = db
    .prepare('SELECT format, status FROM card_legalities WHERE card_id = ?')
    .all(cardId) as { format: string; status: string }[];
  const legalities: Record<string, Legality> = {};
  for (const row of rows) {
    legalities[row.format] = row.status as Legality;
  }
  return legalities;
}

function mapRowToCard(db: Database.Database, row: CardRow): Card {
  return {
    id: row.id,
    oracleId: row.oracle_id,
    name: row.name,
    manaCost: row.mana_cost,
    cmc: row.cmc,
    typeLine: row.type_line,
    oracleText: row.oracle_text,
    power: row.power,
    toughness: row.toughness,
    colors: getCardColors(db, row.id),
    colorIdentity: getCardColorIdentity(db, row.id),
    keywords: getCardKeywords(db, row.id),
    set: row.set_code,
    setName: row.set_name,
    rarity: row.rarity as Rarity,
    legalities: getCardLegalities(db, row.id),
    loyalty: row.loyalty,
    scryfallUri: row.scryfall_uri,
  };
}

export function searchCards(
  db: Database.Database,
  whereClause: string,
  params: readonly unknown[],
): Card[] {
  const sql = `SELECT DISTINCT cards.* FROM cards ${whereClause}`;
  const rows = db.prepare(sql).all(...params) as CardRow[];
  return rows.map((row) => mapRowToCard(db, row));
}

export function getCardByName(db: Database.Database, name: string): Card | undefined {
  const row = db.prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE').get(name) as
    | CardRow
    | undefined;
  if (!row) return undefined;
  return mapRowToCard(db, row);
}

const FUZZY_MATCH_LIMIT = 10;

export function searchCardsByPrefix(db: Database.Database, prefix: string): Card[] {
  const pattern = prefix.replace(/[%_]/g, '\\$&') + '%';
  const rows = db
    .prepare(
      `SELECT * FROM cards WHERE name LIKE ? ESCAPE '\\' COLLATE NOCASE ORDER BY name COLLATE NOCASE LIMIT ?`,
    )
    .all(pattern, FUZZY_MATCH_LIMIT) as CardRow[];
  return rows.map((row) => mapRowToCard(db, row));
}

export interface SubstringSearchResult {
  readonly cards: Card[];
  readonly totalCount: number;
}

export function searchCardsBySubstring(
  db: Database.Database,
  substring: string,
): SubstringSearchResult {
  const pattern = '%' + substring.replace(/[%_]/g, '\\$&') + '%';
  const countRow = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM cards WHERE name LIKE ? ESCAPE '\\' COLLATE NOCASE`,
    )
    .get(pattern) as { cnt: number };
  const rows = db
    .prepare(
      `SELECT * FROM cards WHERE name LIKE ? ESCAPE '\\' COLLATE NOCASE ORDER BY name COLLATE NOCASE LIMIT ?`,
    )
    .all(pattern, FUZZY_MATCH_LIMIT) as CardRow[];
  return {
    cards: rows.map((row) => mapRowToCard(db, row)),
    totalCount: countRow.cnt,
  };
}
