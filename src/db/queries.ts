import type Database from 'better-sqlite3';
import type { Card, Color, Rarity, FormatLegality, Legality, SetRecord } from '../models/index.js';

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
  orderBy?: string,
): Card[] {
  const orderClause = orderBy ? ` ORDER BY ${orderBy}` : '';
  const sql = `SELECT DISTINCT cards.* FROM cards ${whereClause}${orderClause}`;
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

// Default set types to hide (noisy/supplemental)
const HIDDEN_SET_TYPES = new Set(['token', 'memorabilia', 'minigame', 'predraft', 'treasure_chest', 'vanguard']);

export interface SetSearchOptions {
  readonly years?: number[];
  readonly types?: string[];
  readonly includeAll?: boolean;
}

export function searchSets(
  db: Database.Database,
  term?: string,
  options?: SetSearchOptions,
): SetRecord[] {
  const whereConditions: string[] = [];
  const params: unknown[] = [];

  // Build WHERE clause for type filtering (unless --all)
  if (!options?.includeAll && options?.types === undefined) {
    const hiddenTypes = Array.from(HIDDEN_SET_TYPES).map(() => '?').join(',');
    whereConditions.push(`set_type NOT IN (${hiddenTypes})`);
    params.push(...HIDDEN_SET_TYPES);
  }

  // Explicit type filter
  if (options?.types && options.types.length > 0) {
    const typeParams = options.types.map(() => '?').join(',');
    whereConditions.push(`set_type IN (${typeParams})`);
    params.push(...options.types);
  }

  // Explicit year filter
  if (options?.years && options.years.length > 0) {
    const yearConditions = options.years
      .map((year) => `STRFTIME('%Y', released_at) = ?`)
      .join(' OR ');
    whereConditions.push(`(${yearConditions})`);
    params.push(...options.years.map((y) => y.toString()));
  }

  // Smart term detection
  if (term) {
    // Check if term is 4 digits (year)
    if (/^\d{4}$/.test(term)) {
      whereConditions.push(`STRFTIME('%Y', released_at) = ?`);
      params.push(term);
    }
    // Check if term is ≤5 non-numeric chars (try code first, then name)
    else if (term.length <= 5 && !/\d/.test(term)) {
      whereConditions.push(`(code = ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE)`);
      const codePattern = '%' + term.replace(/[%_]/g, '\\$&') + '%';
      params.push(term, codePattern);
    }
    // Otherwise treat as name search
    else {
      whereConditions.push(`name LIKE ? COLLATE NOCASE`);
      const namePattern = '%' + term.replace(/[%_]/g, '\\$&') + '%';
      params.push(namePattern);
    }
  }

  const whereClause = whereConditions.length > 0 ? ' WHERE ' + whereConditions.join(' AND ') : '';
  const sql = `SELECT code, name, released_at, set_type FROM sets${whereClause} ORDER BY released_at ASC, code ASC`;

  const rows = db.prepare(sql).all(...params) as SetRecord[];
  return rows;
}
