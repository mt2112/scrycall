import type Database from 'better-sqlite3';
import type { Card } from '../models/card.js';
import type { ParseError, DbError } from '../models/errors.js';
import type { Result } from '../utils/result.js';
import { ok, err } from '../utils/result.js';
import { parseQuery } from '../parser/index.js';
import { buildQuery } from './query-builder.js';
import { searchCards } from '../db/queries.js';

export function search(
  db: Database.Database,
  queryString: string,
): Result<Card[], ParseError | DbError> {
  const parseResult = parseQuery(queryString);
  if (!parseResult.ok) return parseResult;

  const { sql, params, orderBy } = buildQuery(parseResult.data);

  try {
    const cards = searchCards(db, sql, params, orderBy);
    return ok(cards);
  } catch (e) {
    return err({
      kind: 'db',
      message: `Database query failed: ${e instanceof Error ? e.message : String(e)}`,
      cause: e instanceof Error ? e : undefined,
    });
  }
}
