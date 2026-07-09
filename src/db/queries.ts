import type Database from 'better-sqlite3';
import type { Card, Color, Rarity, FormatLegality, Legality, SetRecord } from '../models/index.js';

const HYDRATION_BATCH_SIZE = 500;

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

interface CardAuxData {
  readonly colors: readonly Color[];
  readonly colorIdentity: readonly Color[];
  readonly keywords: readonly string[];
  readonly legalities: FormatLegality;
}

function chunkCardIds(cardIds: readonly string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < cardIds.length; index += HYDRATION_BATCH_SIZE) {
    chunks.push(cardIds.slice(index, index + HYDRATION_BATCH_SIZE));
  }
  return chunks;
}

function createStringArrayMap(cardIds: readonly string[]): Map<string, string[]> {
  return new Map(cardIds.map((cardId) => [cardId, []]));
}

function loadStringArrayMap(
  db: Database.Database,
  cardIds: readonly string[],
  tableName: 'card_colors' | 'card_color_identity' | 'card_keywords',
  valueColumn: 'color' | 'keyword',
): Map<string, string[]> {
  const valuesByCardId = createStringArrayMap(cardIds);

  for (const cardIdChunk of chunkCardIds(cardIds)) {
    const placeholders = cardIdChunk.map(() => '?').join(', ');
    const sql = `SELECT card_id, ${valueColumn} FROM ${tableName} WHERE card_id IN (${placeholders})`;
    const rows = db.prepare(sql).all(...cardIdChunk) as { card_id: string; color?: string; keyword?: string }[];

    for (const row of rows) {
      const values = valuesByCardId.get(row.card_id);
      if (!values) continue;
      if (valueColumn === 'color' && row.color) {
        values.push(row.color);
      }
      if (valueColumn === 'keyword' && row.keyword) {
        values.push(row.keyword);
      }
    }
  }

  return valuesByCardId;
}

function loadLegalitiesMap(db: Database.Database, cardIds: readonly string[]): Map<string, FormatLegality> {
  const legalitiesByCardId = new Map<string, FormatLegality>(
    cardIds.map((cardId) => [cardId, {}]),
  );

  for (const cardIdChunk of chunkCardIds(cardIds)) {
    const placeholders = cardIdChunk.map(() => '?').join(', ');
    const sql = `SELECT card_id, format, status FROM card_legalities WHERE card_id IN (${placeholders})`;
    const rows = db.prepare(sql).all(...cardIdChunk) as {
      card_id: string;
      format: string;
      status: string;
    }[];

    for (const row of rows) {
      const legalities = legalitiesByCardId.get(row.card_id);
      if (!legalities) continue;
      legalities[row.format] = row.status as Legality;
    }
  }

  return legalitiesByCardId;
}

function buildCardAuxData(db: Database.Database, rows: readonly CardRow[]): Map<string, CardAuxData> {
  const cardIds = rows.map((row) => row.id);
  const colorsByCardId = loadStringArrayMap(db, cardIds, 'card_colors', 'color');
  const colorIdentityByCardId = loadStringArrayMap(db, cardIds, 'card_color_identity', 'color');
  const keywordsByCardId = loadStringArrayMap(db, cardIds, 'card_keywords', 'keyword');
  const legalitiesByCardId = loadLegalitiesMap(db, cardIds);

  return new Map(
    cardIds.map((cardId) => [
      cardId,
      {
        colors: (colorsByCardId.get(cardId) ?? []) as readonly Color[],
        colorIdentity: (colorIdentityByCardId.get(cardId) ?? []) as readonly Color[],
        keywords: keywordsByCardId.get(cardId) ?? [],
        legalities: legalitiesByCardId.get(cardId) ?? {},
      },
    ]),
  );
}

function mapRowToCard(row: CardRow, auxData: CardAuxData): Card {
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
    colors: auxData.colors,
    colorIdentity: auxData.colorIdentity,
    keywords: auxData.keywords,
    set: row.set_code,
    setName: row.set_name,
    rarity: row.rarity as Rarity,
    legalities: auxData.legalities,
    loyalty: row.loyalty,
    scryfallUri: row.scryfall_uri,
  };
}

function hydrateCardRows(db: Database.Database, rows: readonly CardRow[]): Card[] {
  if (rows.length === 0) {
    return [];
  }

  const auxDataByCardId = buildCardAuxData(db, rows);
  return rows.map((row) =>
    mapRowToCard(row, auxDataByCardId.get(row.id) ?? {
      colors: [],
      colorIdentity: [],
      keywords: [],
      legalities: {},
    }),
  );
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
  return hydrateCardRows(db, rows);
}

export function getCardByName(db: Database.Database, name: string): Card | undefined {
  const row = db.prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE').get(name) as
    | CardRow
    | undefined;
  if (!row) return undefined;
  return hydrateCardRows(db, [row])[0];
}

const FUZZY_MATCH_LIMIT = 10;

export function searchCardsByPrefix(db: Database.Database, prefix: string): Card[] {
  const pattern = prefix.replace(/[%_]/g, '\\$&') + '%';
  const rows = db
    .prepare(
      `SELECT * FROM cards WHERE name LIKE ? ESCAPE '\\' COLLATE NOCASE ORDER BY name COLLATE NOCASE LIMIT ?`,
    )
    .all(pattern, FUZZY_MATCH_LIMIT) as CardRow[];
  return hydrateCardRows(db, rows);
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
    cards: hydrateCardRows(db, rows),
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
