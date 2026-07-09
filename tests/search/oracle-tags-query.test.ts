import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/db/migrations.js';
import { importOracleTags } from '../../src/import/importer.js';
import { search } from '../../src/search/search.js';
import { Readable } from 'node:stream';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

// Sample oracle tags with DAG structure for testing
const FIXTURE_ORACLE_TAGS = [
  {
    id: 'tag-root',
    slug: 'effect',
    label: 'Effect',
    type: 'tag',
    parent_ids: [],
    child_ids: ['tag-ramp', 'tag-removal'],
    taggings: [],
    description: 'Cards that have an effect',
  },
  {
    id: 'tag-ramp',
    slug: 'ramp',
    label: 'Ramp',
    type: 'tag',
    parent_ids: ['tag-root'],
    child_ids: [],
    taggings: [
      { oracle_id: 'oracle-ramp-1', weight: 'strong' },
      { oracle_id: 'oracle-ramp-2', weight: 'very_strong' },
      { oracle_id: 'oracle-ramp-3', weight: 'median' },
    ],
    description: 'Mana ramp',
  },
  {
    id: 'tag-removal',
    slug: 'removal',
    label: 'Removal',
    type: 'tag',
    parent_ids: ['tag-root'],
    child_ids: [],
    taggings: [
      { oracle_id: 'oracle-removal-1', weight: 'strong' },
      { oracle_id: 'oracle-removal-2', weight: 'weak' },
    ],
    description: 'Creature/Permanent removal',
  },
];

// Sample cards with oracle_id
const FIXTURE_CARDS = [
  {
    id: 'card-ramp-1',
    oracle_id: 'oracle-ramp-1',
    name: 'Llanowar Elves',
    mana_cost: '{G}',
    cmc: 1,
    type_line: 'Creature — Elf Druid',
    oracle_text: 'T: Add G',
    colors: ['G'],
    color_identity: ['G'],
    keywords: [],
    set: 'neo',
    set_name: 'New Capenna',
    rarity: 'common',
  },
  {
    id: 'card-ramp-2',
    oracle_id: 'oracle-ramp-2',
    name: 'Cultivate',
    mana_cost: '{1}{G}',
    cmc: 2,
    type_line: 'Sorcery',
    oracle_text: 'Search for two basic land cards',
    colors: ['G'],
    color_identity: ['G'],
    keywords: [],
    set: 'neo',
    set_name: 'New Capenna',
    rarity: 'common',
  },
  {
    id: 'card-ramp-3',
    oracle_id: 'oracle-ramp-3',
    name: 'Rampant Growth',
    mana_cost: '{1}{G}',
    cmc: 2,
    type_line: 'Sorcery',
    oracle_text: 'Search for a basic land',
    colors: ['G'],
    color_identity: ['G'],
    keywords: [],
    set: 'neo',
    set_name: 'New Capenna',
    rarity: 'common',
  },
  {
    id: 'card-removal-1',
    oracle_id: 'oracle-removal-1',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage',
    colors: ['R'],
    color_identity: ['R'],
    keywords: [],
    set: 'neo',
    set_name: 'New Capenna',
    rarity: 'common',
  },
  {
    id: 'card-removal-2',
    oracle_id: 'oracle-removal-2',
    name: 'Pacifism',
    mana_cost: '{1}{W}',
    cmc: 2,
    type_line: 'Enchantment — Aura',
    oracle_text: 'Enchanted creature cannot attack',
    colors: ['W'],
    color_identity: ['W'],
    keywords: [],
    set: 'neo',
    set_name: 'New Capenna',
    rarity: 'common',
  },
];

describe('oracle tags query builder', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = createTestDb();

    // Import oracle tags
    const tagsStream = Readable.from([JSON.stringify(FIXTURE_ORACLE_TAGS)]);
    const tagsResult = await importOracleTags(db, tagsStream);
    expect(tagsResult.ok).toBe(true);

    // Insert test cards
    const insertCard = db.prepare(`
      INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, set_code, set_name, rarity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertColor = db.prepare('INSERT INTO card_colors (card_id, color) VALUES (?, ?)');

    for (const card of FIXTURE_CARDS) {
      insertCard.run(
        card.id,
        card.oracle_id,
        card.name,
        card.mana_cost,
        card.cmc,
        card.type_line,
        card.oracle_text,
        card.set,
        card.set_name,
        card.rarity,
      );

      // Insert colors
      for (const color of card.colors) {
        insertColor.run(card.id, color);
      }
    }
  });

  it('should query otag:ramp', () => {
    const result = search(db, 'otag:ramp');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2); // oracle-ramp-1 (strong), oracle-ramp-2 (very_strong)
  });

  it('should query otag:removal', () => {
    const result = search(db, 'otag:removal');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1); // oracle-removal-1 (strong) only, not weak
  });

  it('should filter by weight (exclude median and weak)', () => {
    const result = search(db, 'otag:ramp');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Should only include cards tagged strong and very_strong, not median
    expect(result.data).toHaveLength(2);
    const names = result.data.map((c) => c.name);
    expect(names).toContain('Llanowar Elves'); // oracle-ramp-1, strong
    expect(names).toContain('Cultivate'); // oracle-ramp-2, very_strong
    expect(names).not.toContain('Rampant Growth'); // oracle-ramp-3, median
  });

  it('should support otag!=ramp (negation)', () => {
    const result = search(db, 'otag!=ramp');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Should return cards that don't have ramp tag with strong+ weight
    expect(result.data).toHaveLength(3); // removal-1, removal-2, and ramp-3 (median weight)
  });

  it('should combine otag with other operators', () => {
    const result = search(db, 'otag:ramp and c:green');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2); // both ramp cards are green
  });

  it('should support otag in OR expressions', () => {
    const result = search(db, 'otag:ramp or otag:removal');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(3); // 2 ramp + 1 removal (strong weight only)
  });

  it('should handle unknown otag gracefully', () => {
    const result = search(db, 'otag:nonexistent');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });

  it('should combine otag with color filter', () => {
    const result = search(db, 'otag:removal c:red');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1); // Lightning Bolt is red + removal
    expect(result.data[0].name).toBe('Lightning Bolt');
  });

  it('should combine multiple otag queries with AND', () => {
    // This requires a card with both tags (not in our fixture) but should handle gracefully
    const result = search(db, 'otag:ramp and otag:removal');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0); // No card has both tags
  });

  it('should support negated otag in complex query', () => {
    const result = search(db, 'c:red and -otag:removal');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Lightning Bolt is red and removal (strong), so should be excluded
    expect(result.data).toHaveLength(0);
  });

  it('should work with parent tags (expansion)', async () => {
    // Query parent tag 'effect' which should expand to ramp + removal
    const result = search(db, 'otag:effect');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Should include cards tagged with effect's children (ramp, removal)
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should handle case-insensitive tag queries', () => {
    const result1 = search(db, 'otag:ramp');
    const result2 = search(db, 'otag:RAMP');
    const result3 = search(db, 'otag:Ramp');

    expect(result1.ok && result2.ok && result3.ok).toBe(true);
    if (!(result1.ok && result2.ok && result3.ok)) return;

    expect(result1.data).toHaveLength(result2.data.length);
    expect(result1.data).toHaveLength(result3.data.length);
  });

  afterEach(() => {
    db.close();
  });
});
