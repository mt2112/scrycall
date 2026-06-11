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

  // Collect all cards first, then batch insert
  const cards: ScryfallCard[] = [];

  try {
    await pipeline(
      inputStream,
      parser(),
      streamArray(),
      new Transform({
        objectMode: true,
        transform(chunk: { key: number; value: ScryfallCard }, _encoding, callback): void {
          cards.push(chunk.value);
          callback();
        },
      }),
    );
  } catch (e) {
    return err({
      kind: 'import',
      message: `Failed to parse card data: ${e instanceof Error ? e.message : String(e)}`,
      cause: e instanceof Error ? e : undefined,
    });
  }

  try {
    // Clear existing data and insert all within a single transaction
    onProgress?.({ phase: 'write' });
    const importTransaction = db.transaction(() => {
      db.exec('DELETE FROM card_tags');
      db.exec('DELETE FROM card_legalities');
      db.exec('DELETE FROM card_keywords');
      db.exec('DELETE FROM card_color_identity');
      db.exec('DELETE FROM card_colors');
      db.exec('DELETE FROM cards');

      for (const card of cards) {
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

      // Rebuild FTS5 index
      onProgress?.({ phase: 'index' });
      db.exec("INSERT INTO cards_fts(cards_fts) VALUES('rebuild')");
    });

    importTransaction();
  } catch (e) {
    return err({
      kind: 'import',
      message: `Failed to import cards into database: ${e instanceof Error ? e.message : String(e)}`,
      cause: e instanceof Error ? e : undefined,
    });
  }

  const duration = Date.now() - startTime;
  return ok({ cardCount, duration });
}
