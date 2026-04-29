import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { Readable } from 'node:stream';
import { runMigrations } from '../../src/db/migrations.js';
import { importCards } from '../../src/import/importer.js';
import { getCardByName } from '../../src/db/queries.js';

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
  {
    id: 'serra-uuid',
    oracle_id: 'serra-oracle',
    name: 'Serra Angel',
    mana_cost: '{3}{W}{W}',
    cmc: 5,
    type_line: 'Creature — Angel',
    oracle_text: 'Flying, vigilance',
    power: '4',
    toughness: '4',
    colors: ['W'],
    color_identity: ['W'],
    keywords: ['Flying', 'Vigilance'],
    set: 'lea',
    set_name: 'Limited Edition Alpha',
    rarity: 'uncommon',
    legalities: { modern: 'legal', legacy: 'legal', standard: 'not_legal' },
  },
];

function createFixtureStream(): Readable {
  const json = JSON.stringify(FIXTURE_CARDS);
  return Readable.from([json]);
}

describe('importer', () => {
  it('should import cards from a JSON stream', async () => {
    const db = createTestDb();
    const stream = createFixtureStream();

    const result = await importCards(db, stream);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cardCount).toBe(2);
    expect(result.data.duration).toBeGreaterThanOrEqual(0);

    db.close();
  });

  it('should populate cards table', async () => {
    const db = createTestDb();
    await importCards(db, createFixtureStream());

    const bolt = getCardByName(db, 'Lightning Bolt');
    expect(bolt).toBeDefined();
    expect(bolt!.manaCost).toBe('{R}');
    expect(bolt!.cmc).toBe(1);
    expect(bolt!.typeLine).toBe('Instant');

    db.close();
  });

  it('should populate colors', async () => {
    const db = createTestDb();
    await importCards(db, createFixtureStream());

    const bolt = getCardByName(db, 'Lightning Bolt');
    expect(bolt!.colors).toEqual(['R']);

    const serra = getCardByName(db, 'Serra Angel');
    expect(serra!.colors).toEqual(['W']);

    db.close();
  });

  it('should populate keywords', async () => {
    const db = createTestDb();
    await importCards(db, createFixtureStream());

    const serra = getCardByName(db, 'Serra Angel');
    expect(serra!.keywords).toContain('Flying');
    expect(serra!.keywords).toContain('Vigilance');

    db.close();
  });

  it('should populate legalities', async () => {
    const db = createTestDb();
    await importCards(db, createFixtureStream());

    const bolt = getCardByName(db, 'Lightning Bolt');
    expect(bolt!.legalities.modern).toBe('legal');
    expect(bolt!.legalities.standard).toBe('not_legal');

    db.close();
  });

  it('should make cards searchable via FTS', async () => {
    const db = createTestDb();
    await importCards(db, createFixtureStream());

    const rows = db
      .prepare("SELECT * FROM cards_fts WHERE cards_fts MATCH 'lightning'")
      .all();
    expect(rows.length).toBeGreaterThanOrEqual(1);

    db.close();
  });

  it('should invoke onProgress callback with write and index phases', async () => {
    const db = createTestDb();
    const phases: string[] = [];
    const onProgress = (event: { phase: string }) => {
      phases.push(event.phase);
    };

    const result = await importCards(db, createFixtureStream(), onProgress);
    expect(result.ok).toBe(true);
    expect(phases).toEqual(['write', 'index']);

    db.close();
  });

  it('should work without onProgress callback', async () => {
    const db = createTestDb();
    const result = await importCards(db, createFixtureStream());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cardCount).toBe(2);

    db.close();
  });

  it('should store layout column', async () => {
    const db = createTestDb();
    const cards = [
      {
        ...FIXTURE_CARDS[0],
        layout: 'normal',
      },
    ];
    const stream = Readable.from([JSON.stringify(cards)]);
    await importCards(db, stream);

    const row = db.prepare('SELECT layout FROM cards WHERE id = ?').get('bolt-uuid') as { layout: string };
    expect(row.layout).toBe('normal');

    db.close();
  });

  it('should populate card_tags for matching cards', async () => {
    const db = createTestDb();
    const cards = [
      {
        id: 'fountain-uuid',
        oracle_id: 'fountain-oracle',
        name: 'Hallowed Fountain',
        mana_cost: null,
        cmc: 0,
        type_line: 'Land — Plains Island',
        oracle_text: 'As Hallowed Fountain enters, you may pay 2 life. If you don\'t, it enters tapped.',
        colors: [],
        color_identity: ['W', 'U'],
        keywords: [],
        set: 'rna',
        set_name: 'Ravnica Allegiance',
        rarity: 'rare',
        legalities: { modern: 'legal', standard: 'not_legal' },
        layout: 'normal',
      },
    ];
    const stream = Readable.from([JSON.stringify(cards)]);
    await importCards(db, stream);

    const tags = db
      .prepare('SELECT tag FROM card_tags WHERE card_id = ? ORDER BY tag')
      .all('fountain-uuid') as { tag: string }[];
    const tagNames = tags.map((t) => t.tag);
    expect(tagNames).toContain('shockland');

    db.close();
  });
});
