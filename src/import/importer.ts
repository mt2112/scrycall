import type Database from 'better-sqlite3';
import type { Readable } from 'node:stream';
import type { Result } from '../utils/result.js';
import type { ImportError } from '../models/errors.js';
import type { ImportProgressCallback } from '../models/index.js';
import { ok, err } from '../utils/result.js';
import { tagCard } from './tagger.js';
import pkg from 'stream-json';
const { parser } = pkg;
import sa from 'stream-json/streamers/StreamArray.js';
const { streamArray } = sa;
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';

const IMPORT_BATCH_SIZE = 500;

class ImportWriteError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ImportWriteError';
  }
}

export interface ImportStats {
  readonly cardCount: number;
  readonly duration: number;
}

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity?: string[];
  keywords?: string[];
  set: string;
  set_name: string;
  rarity: string;
  loyalty?: string;
  legalities?: Record<string, string>;
  scryfall_uri?: string;
  layout?: string;
  released_at?: string;
  set_type?: string;
}

export async function importCards(
  db: Database.Database,
  inputStream: Readable,
  onProgress?: ImportProgressCallback,
): Promise<Result<ImportStats, ImportError>> {
  const startTime = Date.now();
  let cardCount = 0;

  const insertCard = db.prepare(
    `INSERT OR REPLACE INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, power, toughness, set_code, set_name, rarity, loyalty, scryfall_uri, layout)
     VALUES (@id, @oracle_id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @power, @toughness, @set_code, @set_name, @rarity, @loyalty, @scryfall_uri, @layout)`,
  );
  const insertColor = db.prepare(
    'INSERT OR IGNORE INTO card_colors (card_id, color) VALUES (?, ?)',
  );
  const insertIdentity = db.prepare(
    'INSERT OR IGNORE INTO card_color_identity (card_id, color) VALUES (?, ?)',
  );
  const insertKeyword = db.prepare(
    'INSERT OR IGNORE INTO card_keywords (card_id, keyword) VALUES (?, ?)',
  );
  const insertLegality = db.prepare(
    'INSERT OR REPLACE INTO card_legalities (card_id, format, status) VALUES (?, ?, ?)',
  );
  const insertTag = db.prepare(
    'INSERT OR IGNORE INTO card_tags (card_id, tag) VALUES (?, ?)',
  );
  const insertSet = db.prepare(
    'INSERT OR IGNORE INTO sets (code, name, released_at, set_type) VALUES (?, ?, ?, ?)',
  );

  const sets = new Map<string, { name: string; released_at?: string; set_type?: string }>();

  function insertCardGraph(card: ScryfallCard): void {
    insertCard.run({
      id: card.id,
      oracle_id: card.oracle_id,
      name: card.name,
      mana_cost: card.mana_cost ?? null,
      cmc: card.cmc ?? 0,
      type_line: card.type_line ?? '',
      oracle_text: card.oracle_text ?? null,
      power: card.power ?? null,
      toughness: card.toughness ?? null,
      set_code: card.set,
      set_name: card.set_name,
      rarity: card.rarity,
      loyalty: card.loyalty ?? null,
      scryfall_uri: card.scryfall_uri ?? null,
      layout: card.layout ?? null,
    });

    if (card.colors) {
      for (const color of card.colors) {
        insertColor.run(card.id, color);
      }
    }

    if (card.color_identity) {
      for (const color of card.color_identity) {
        insertIdentity.run(card.id, color);
      }
    }

    if (card.keywords) {
      for (const kw of card.keywords) {
        insertKeyword.run(card.id, kw);
      }
    }

    if (card.legalities) {
      for (const [format, status] of Object.entries(card.legalities)) {
        insertLegality.run(card.id, format, status);
      }
    }

    const tags = tagCard(card);
    for (const tag of tags) {
      insertTag.run(card.id, tag);
    }

    cardCount++;
  }

  function flushBatch(batch: ScryfallCard[]): void {
    for (const card of batch) {
      insertCardGraph(card);
    }
    batch.length = 0;
  }

  try {
    onProgress?.({ phase: 'write' });
    db.exec('BEGIN IMMEDIATE');
    db.exec('DELETE FROM card_tags');
    db.exec('DELETE FROM card_legalities');
    db.exec('DELETE FROM card_keywords');
    db.exec('DELETE FROM card_color_identity');
    db.exec('DELETE FROM card_colors');
    db.exec('DELETE FROM cards');

    const batch: ScryfallCard[] = [];

    await pipeline(
      inputStream,
      parser(),
      streamArray(),
      new Transform({
        objectMode: true,
        transform(chunk: { key: number; value: ScryfallCard }, _encoding, callback): void {
          try {
            batch.push(chunk.value);
            if (!sets.has(chunk.value.set)) {
              sets.set(chunk.value.set, {
                name: chunk.value.set_name,
                released_at: chunk.value.released_at,
                set_type: chunk.value.set_type,
              });
            }
            if (batch.length >= IMPORT_BATCH_SIZE) {
              flushBatch(batch);
            }
            callback();
          } catch (error) {
            callback(
              new ImportWriteError('Failed to write parsed cards to the database', {
                cause: error,
              }),
            );
          }
        },
        flush(callback): void {
          try {
            flushBatch(batch);
            callback();
          } catch (error) {
            callback(
              new ImportWriteError('Failed to write parsed cards to the database', {
                cause: error,
              }),
            );
          }
        },
      }),
    );

    for (const [code, setData] of sets) {
      insertSet.run(code, setData.name, setData.released_at ?? null, setData.set_type ?? null);
    }

    onProgress?.({ phase: 'index' });
    db.exec("INSERT INTO cards_fts(cards_fts) VALUES('rebuild')");
    db.exec('COMMIT');
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback failures so the original import error is preserved.
    }

    const isWriteError = e instanceof ImportWriteError;
    return err({
      kind: 'import',
      message: isWriteError
        ? `Failed to import cards into database: ${e.message}`
        : `Failed to parse card data: ${e instanceof Error ? e.message : String(e)}`,
      cause: e instanceof Error ? e : undefined,
    });
  }

  const duration = Date.now() - startTime;
  return ok({ cardCount, duration });
}

// Oracle Tags Import Interfaces & Types
interface OracleTagData {
  id: string;
  slug: string;
  label: string;
  type: string;
  parent_ids?: string[];
  child_ids?: string[];
  taggings?: Array<{ oracle_id: string; weight: string }>;
  description?: string;
  aliases?: string[];
}

interface OracleTagNode {
  id: string;
  slug: string;
  label: string;
  parent_ids: Set<string>;
  children: Set<string>;
  taggings: Array<{ oracle_id: string; weight: string }>;
  description?: string;
}

// Build DAG from oracle tags data
function buildDAG(tags: OracleTagData[]): Map<string, OracleTagNode> {
  const dag = new Map<string, OracleTagNode>();

  // Create nodes
  for (const tag of tags) {
    dag.set(tag.id, {
      id: tag.id,
      slug: tag.slug,
      label: tag.label,
      parent_ids: new Set(tag.parent_ids ?? []),
      children: new Set(),
      taggings: tag.taggings ?? [],
      description: tag.description,
    });
  }

  // Build bidirectional edges
  for (const [tagId, node] of dag) {
    for (const parentId of node.parent_ids) {
      const parent = dag.get(parentId);
      if (parent) {
        parent.children.add(tagId);
      }
    }
  }

  return dag;
}

// Compute transitive closure using BFS
function computeTransitiveClosure(dag: Map<string, OracleTagNode>, tagId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [tagId];
  const descendants = new Set<string>();

  // BFS to find all descendants
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = dag.get(current);

    if (!node || visited.has(current)) continue;
    visited.add(current);

    // Add all children to descendants and queue
    for (const childId of node.children) {
      descendants.add(childId);
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return descendants;
}

// Detect cycles in DAG (defensive check)
function detectCycles(dag: Map<string, OracleTagNode>): string[] {
  const cycles: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = dag.get(nodeId);
    if (!node) return false;

    for (const childId of node.children) {
      if (!visited.has(childId)) {
        if (dfs(childId)) return true;
      } else if (recursionStack.has(childId)) {
        cycles.push(`${nodeId} -> ${childId}`);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of dag.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return cycles;
}

export interface OracleImportStats {
  readonly tagCount: number;
  readonly taggingCount: number;
  readonly duration: number;
}

export async function importOracleTags(
  db: Database.Database,
  inputStream: Readable,
  onProgress?: ImportProgressCallback,
): Promise<Result<OracleImportStats, ImportError>> {
  const startTime = Date.now();
  let tagCount = 0;
  let taggingCount = 0;

  const insertTag = db.prepare(
    `INSERT OR REPLACE INTO oracle_tags (tag_id, slug, label, parent_id, description, cached_descendants_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const insertTagging = db.prepare(
    `INSERT OR REPLACE INTO oracle_taggings (oracle_id, tag_id, weight)
     VALUES (?, ?, ?)`,
  );

  try {
    onProgress?.({ phase: 'parse' });

    const tags: OracleTagData[] = [];
    const batch: OracleTagData[] = [];
    const BATCH_SIZE = 100;

    await pipeline(
      inputStream,
      parser(),
      streamArray(),
      new Transform({
        objectMode: true,
        transform(chunk: { key: number; value: OracleTagData }, _encoding, callback): void {
          try {
            batch.push(chunk.value);
            if (batch.length >= BATCH_SIZE) {
              tags.push(...batch);
              batch.length = 0;
            }
            callback();
          } catch (error) {
            callback(
              new ImportWriteError('Failed to parse oracle tags', {
                cause: error,
              }),
            );
          }
        },
        flush(callback): void {
          try {
            tags.push(...batch);
            callback();
          } catch (error) {
            callback(
              new ImportWriteError('Failed to parse oracle tags', {
                cause: error,
              }),
            );
          }
        },
      }),
    );

    onProgress?.({ phase: 'write' });

    // Build DAG
    const dag = buildDAG(tags);

    // Check for cycles (defensive)
    const cycles = detectCycles(dag);
    if (cycles.length > 0) {
      console.warn(`Warning: Detected ${cycles.length} cycles in oracle tags DAG`);
      for (const cycle of cycles.slice(0, 5)) {
        console.warn(`  ${cycle}`);
      }
    }

    // Compute transitive closures for all tags
    const closures = new Map<string, Set<string>>();
    for (const tagId of dag.keys()) {
      closures.set(tagId, computeTransitiveClosure(dag, tagId));
    }

    onProgress?.({ phase: 'write' });

    // Clear existing oracle tags
    db.exec('DELETE FROM oracle_taggings');
    db.exec('DELETE FROM oracle_tags');

    // Defer foreign key checks during bulk insert
    db.exec('PRAGMA defer_foreign_keys = ON');
    db.exec('BEGIN IMMEDIATE');

    // Insert tags with cached descendants
    for (const [tagId, node] of dag) {
      const descendants = closures.get(tagId) || new Set();
      const descendantsJson = JSON.stringify(Array.from(descendants));

      // Find single parent (if hierarchy is tree-like; otherwise use first parent)
      const parentId = node.parent_ids.size > 0 ? Array.from(node.parent_ids)[0] : null;

      insertTag.run(tagId, node.slug, node.label, parentId ?? null, node.description ?? null, descendantsJson);
      tagCount++;
    }

    // Insert taggings for each card-tag association
    for (const [tagId, node] of dag) {
      for (const tagging of node.taggings) {
        insertTagging.run(tagging.oracle_id, tagId, tagging.weight);
        taggingCount++;
      }
    }

    db.exec('COMMIT');

    console.log(`Oracle tags import complete: ${tagCount} tags, ${taggingCount} taggings`);
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback failures
    }

    const isWriteError = e instanceof ImportWriteError;
    return err({
      kind: 'import',
      message: isWriteError
        ? `Failed to import oracle tags: ${e.message}`
        : `Failed to parse oracle tags data: ${e instanceof Error ? e.message : String(e)}`,
      cause: e instanceof Error ? e : undefined,
    });
  }

  const duration = Date.now() - startTime;
  return ok({ tagCount, taggingCount, duration });
}
