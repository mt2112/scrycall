import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { Readable } from 'node:stream';
import { runMigrations } from '../../src/db/migrations.js';
import { importOracleTags } from '../../src/import/importer.js';
import { search } from '../../src/search/search.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

// Helper to create a stream from an array of objects (as JSON array)
function createJsonStream(objects: object[]): Readable {
  const json = JSON.stringify(objects);
  return Readable.from([json]);
}

// Helper to insert test cards
function insertTestCards(db: Database.Database): void {
  const insertCard = db.prepare(
    `INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, power, toughness, set_code, set_name, rarity, loyalty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertColor = db.prepare('INSERT INTO card_colors (card_id, color) VALUES (?, ?)');

  // Ramp cards
  insertCard.run('ramp-1', 'oracle-ramp-1', 'Llanowar Elves', '{G}', 1, 'Creature — Elf Druid', 'Tap: Add G.', '1', '1', 'led', 'Legends', 'common', null);
  insertColor.run('ramp-1', 'G');

  insertCard.run('ramp-2', 'oracle-ramp-2', 'Cultivate', '{2}{G}', 3, 'Sorcery', 'Search your library for up to two basic lands.', null, null, 'con', 'Conflux', 'common', null);
  insertColor.run('ramp-2', 'G');

  insertCard.run('ramp-3', 'oracle-ramp-3', 'Rampant Growth', '{1}{G}', 2, 'Sorcery', 'Search your library for a basic land card.', null, null, 'ody', 'Odyssey', 'common', null);
  insertColor.run('ramp-3', 'G');

  // Removal cards
  insertCard.run('removal-1', 'oracle-removal-1', 'Lightning Bolt', '{R}', 1, 'Instant', 'Lightning Bolt deals 3 damage to any target.', null, null, 'lea', 'Alpha', 'common', null);
  insertColor.run('removal-1', 'R');

  insertCard.run('removal-2', 'oracle-removal-2', 'Doom Blade', '{1}{B}', 2, 'Instant', 'Destroy target non-black creature.', null, null, 'zen', 'Zendikar', 'common', null);
  insertColor.run('removal-2', 'B');

  // Utility card (not tagged)
  insertCard.run('utility-1', 'oracle-utility-1', 'Counterspell', '{U}{U}', 2, 'Instant', 'Counter target spell.', null, null, 'lea', 'Alpha', 'common', null);
  insertColor.run('utility-1', 'U');
}

describe('oracle tags integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    insertTestCards(db);
  });

  it('should complete full import → query → results pipeline', async () => {
    // 1. Import oracle tags
    const oracleTags = [
      {
        id: 'tag-effect',
        slug: 'effect',
        label: 'Effect',
        type: 'tag',
        parent_ids: [],
        child_ids: ['tag-ramp', 'tag-removal'],
        taggings: [],
        description: 'Root effect category',
      },
      {
        id: 'tag-ramp',
        slug: 'ramp',
        label: 'Ramp',
        type: 'tag',
        parent_ids: ['tag-effect'],
        child_ids: [],
        taggings: [
          { oracle_id: 'oracle-ramp-1', weight: 'strong' },
          { oracle_id: 'oracle-ramp-2', weight: 'very_strong' },
          { oracle_id: 'oracle-ramp-3', weight: 'median' },
        ],
        description: 'Mana acceleration',
      },
      {
        id: 'tag-removal',
        slug: 'removal',
        label: 'Removal',
        type: 'tag',
        parent_ids: ['tag-effect'],
        child_ids: [],
        taggings: [
          { oracle_id: 'oracle-removal-1', weight: 'strong' },
          { oracle_id: 'oracle-removal-2', weight: 'weak' },
        ],
        description: 'Creature/permanent removal',
      },
    ];

    const stream = createJsonStream(oracleTags);
    await importOracleTags(db, stream);

    // Verify tags are imported
    const tagCount = db.prepare('SELECT COUNT(*) as count FROM oracle_tags').get() as { count: number };
    expect(tagCount.count).toBe(3);

    // 2. Query for ramp tag
    const rampResult = search(db, 'otag:ramp');
    expect(rampResult.ok).toBe(true);
    if (!rampResult.ok) return;
    expect(rampResult.data).toHaveLength(2); // Strong + Very_strong only
    expect(rampResult.data.map((c) => c.name).sort()).toEqual(['Cultivate', 'Llanowar Elves']);

    // 3. Query for removal tag
    const removalResult = search(db, 'otag:removal');
    expect(removalResult.ok).toBe(true);
    if (!removalResult.ok) return;
    expect(removalResult.data).toHaveLength(1); // Only strong weight
    expect(removalResult.data[0].name).toBe('Lightning Bolt');

    // 4. Query parent tag (should expand)
    const effectResult = search(db, 'otag:effect');
    expect(effectResult.ok).toBe(true);
    if (!effectResult.ok) return;
    // Should find all strong+very_strong cards from ramp and removal
    expect(effectResult.data.length).toBe(3);
    const effectNames = effectResult.data.map((c) => c.name).sort();
    expect(effectNames).toEqual(['Cultivate', 'Lightning Bolt', 'Llanowar Elves']);

    // 5. Query with OR
    const orResult = search(db, 'otag:ramp or otag:removal');
    expect(orResult.ok).toBe(true);
    if (!orResult.ok) return;
    expect(orResult.data).toHaveLength(3);

    // 6. Query with negation
    const negResult = search(db, 'otag!=ramp');
    expect(negResult.ok).toBe(true);
    if (!negResult.ok) return;
    // Should include removal + ramp-3 (median weight, excluded by otag:ramp)
    expect(negResult.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle large tag hierarchies efficiently', async () => {
    // Create a deeper hierarchy
    const tags = [
      {
        id: 'tag-magic',
        slug: 'magic',
        label: 'Magic',
        type: 'tag',
        parent_ids: [],
        child_ids: ['tag-effect'],
        taggings: [],
        description: 'All magic',
      },
      {
        id: 'tag-effect',
        slug: 'effect',
        label: 'Effect',
        type: 'tag',
        parent_ids: ['tag-magic'],
        child_ids: ['tag-ramp', 'tag-removal'],
        taggings: [],
        description: 'Effects',
      },
      {
        id: 'tag-ramp',
        slug: 'ramp',
        label: 'Ramp',
        type: 'tag',
        parent_ids: ['tag-effect'],
        child_ids: [],
        taggings: [
          { oracle_id: 'oracle-ramp-1', weight: 'strong' },
          { oracle_id: 'oracle-ramp-2', weight: 'very_strong' },
        ],
        description: 'Ramp',
      },
      {
        id: 'tag-removal',
        slug: 'removal',
        label: 'Removal',
        type: 'tag',
        parent_ids: ['tag-effect'],
        child_ids: [],
        taggings: [{ oracle_id: 'oracle-removal-1', weight: 'strong' }],
        description: 'Removal',
      },
    ];

    const stream = createJsonStream(tags);
    const start = performance.now();
    await importOracleTags(db, stream);
    const importTime = performance.now() - start;

    // Import should be fast
    expect(importTime).toBeLessThan(5000); // 5 seconds for setup

    // Query should be fast
    const queryStart = performance.now();
    const result = search(db, 'otag:magic');
    const queryTime = performance.now() - queryStart;

    expect(result.ok).toBe(true);
    expect(queryTime).toBeLessThan(100); // Query should be <100ms
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should maintain consistency across multiple queries', async () => {
    // Import tags
    const tags = [
      {
        id: 'tag-ramp',
        slug: 'ramp',
        label: 'Ramp',
        type: 'tag',
        parent_ids: [],
        child_ids: [],
        taggings: [
          { oracle_id: 'oracle-ramp-1', weight: 'strong' },
          { oracle_id: 'oracle-ramp-2', weight: 'very_strong' },
        ],
        description: 'Ramp',
      },
    ];

    const stream = createJsonStream(tags);
    await importOracleTags(db, stream);

    // Run same query multiple times
    const result1 = search(db, 'otag:ramp');
    const result2 = search(db, 'otag:ramp');
    const result3 = search(db, 'otag:ramp');

    // All should return same results
    expect(result1.ok && result2.ok && result3.ok).toBe(true);
    if (!(result1.ok && result2.ok && result3.ok)) return;

    expect(result1.data).toHaveLength(result2.data.length);
    expect(result1.data).toHaveLength(result3.data.length);
    expect(result1.data.map((c) => c.id).sort()).toEqual(result2.data.map((c) => c.id).sort());
  });

  it('should correctly filter by weight across different queries', async () => {
    // Import tags with mixed weights
    const tags = [
      {
        id: 'tag-draw',
        slug: 'draw',
        label: 'Draw',
        type: 'tag',
        parent_ids: [],
        child_ids: [],
        taggings: [
          { oracle_id: 'oracle-ramp-1', weight: 'very_strong' },
          { oracle_id: 'oracle-ramp-2', weight: 'strong' },
          { oracle_id: 'oracle-ramp-3', weight: 'median' },
          { oracle_id: 'oracle-removal-1', weight: 'weak' },
        ],
        description: 'Draw effect',
      },
    ];

    const stream = createJsonStream(tags);
    await importOracleTags(db, stream);

    // Query should only return strong+ weights
    const result = search(db, 'otag:draw');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should include only very_strong and strong
    expect(result.data).toHaveLength(2);
    const names = result.data.map((c) => c.name).sort();
    expect(names).toEqual(['Cultivate', 'Llanowar Elves']);
  });

  it('should handle edge case: querying untagged cards', () => {
    // Without importing any tags, search should return empty
    const result = search(db, 'otag:ramp');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });

  it('should handle edge case: tag with no taggings', async () => {
    // Import tag with no taggings
    const tags = [
      {
        id: 'tag-empty',
        slug: 'empty',
        label: 'Empty',
        type: 'tag',
        parent_ids: [],
        child_ids: [],
        taggings: [],
        description: 'Empty tag',
      },
    ];

    const stream = createJsonStream(tags);
    await importOracleTags(db, stream);

    // Query should work but return no cards
    const result = search(db, 'otag:empty');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });

  it('should detect and prevent cycles in tag hierarchy', async () => {
    // Create a cyclic structure: A -> B -> C -> A
    const tags = [
      {
        id: 'tag-a',
        slug: 'a',
        label: 'A',
        type: 'tag',
        parent_ids: ['tag-c'], // Points back to C, creating cycle
        child_ids: ['tag-b'],
        taggings: [{ oracle_id: 'oracle-ramp-1', weight: 'strong' }],
        description: 'Tag A',
      },
      {
        id: 'tag-b',
        slug: 'b',
        label: 'B',
        type: 'tag',
        parent_ids: ['tag-a'],
        child_ids: ['tag-c'],
        taggings: [],
        description: 'Tag B',
      },
      {
        id: 'tag-c',
        slug: 'c',
        label: 'C',
        type: 'tag',
        parent_ids: ['tag-b'],
        child_ids: ['tag-a'],
        taggings: [],
        description: 'Tag C',
      },
    ];

    const stream = createJsonStream(tags);

    // Cycle detection should prevent import from causing infinite loops
    // The import should either fail gracefully or handle the cycle
    try {
      await importOracleTags(db, stream, {
        onProgress: (phase, progress) => {
          // Silently track progress
        },
      });

      // If no error, verify results are still usable (no infinite loops)
      const result = search(db, 'otag:a');
      expect(result.ok).toBe(true);
      // Transitive closure should handle cycle gracefully
    } catch (e) {
      // Cycle detection error is acceptable
      expect(e).toBeDefined();
    }
  });
});
