import { describe, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';
import { Readable } from 'node:stream';
import { runMigrations } from '../../src/db/migrations.js';
import { runImport } from '../../src/import/index.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

const FIXTURE_CARDS = [
  {
    id: 'bolt-uuid',
    oracle_id: 'bolt-oracle',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    colors: ['R'],
    color_identity: ['R'],
    keywords: [],
    set: 'lea',
    set_name: 'Limited Edition Alpha',
    rarity: 'common',
    legalities: { modern: 'legal', legacy: 'legal', standard: 'not_legal' },
  },
];

describe('runImport progress', () => {
  it('should invoke onProgress with all phases in order', async () => {
    const json = JSON.stringify(FIXTURE_CARDS);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(json));
        controller.close();
      },
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ type: 'oracle_cards', download_uri: 'https://example.com/oracle-cards.json' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        body: stream,
      });
    vi.stubGlobal('fetch', fetchMock);

    const db = createTestDb();
    const phases: string[] = [];

    const result = await runImport(db, {
      onProgress: (event) => {
        phases.push(event.phase);
      },
    });

    expect(result.ok).toBe(true);
    expect(phases).toEqual(['manifest', 'download', 'parse', 'write', 'index']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.scryfall.com/bulk-data', {
      headers: {
        'User-Agent': 'scrycall/0.1.0',
        Accept: 'application/json',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://example.com/oracle-cards.json', {
      headers: {
        'User-Agent': 'scrycall/0.1.0',
        Accept: 'application/json',
      },
    });

    db.close();
    vi.unstubAllGlobals();
  });
});
