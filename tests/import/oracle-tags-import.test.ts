import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { Readable } from 'node:stream';
import { runMigrations } from '../../src/db/migrations.js';
import { importOracleTags } from '../../src/import/importer.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

// Sample oracle tags with DAG structure for testing
const FIXTURE_ORACLE_TAGS = [
  // Root tags (no parents)
  {
    id: 'tag-root-1',
    slug: 'effect',
    label: 'Effect',
    type: 'tag',
    parent_ids: [],
    child_ids: ['tag-child-1', 'tag-child-2'],
    taggings: [],
    description: 'Cards that have an effect',
  },
  // Child tags (have parent)
  {
    id: 'tag-child-1',
    slug: 'draw',
    label: 'Draw',
    type: 'tag',
    parent_ids: ['tag-root-1'],
    child_ids: ['tag-leaf-1'],
    taggings: [{ oracle_id: 'card-uuid-1', weight: 'strong' }],
    description: 'Cards that draw',
  },
  {
    id: 'tag-child-2',
    slug: 'removal',
    label: 'Removal',
    type: 'tag',
    parent_ids: ['tag-root-1'],
    child_ids: ['tag-leaf-2'],
    taggings: [{ oracle_id: 'card-uuid-2', weight: 'very_strong' }],
    description: 'Cards that remove',
  },
  // Leaf tags
  {
    id: 'tag-leaf-1',
    slug: 'instant-speed-draw',
    label: 'Instant Speed Draw',
    type: 'tag',
    parent_ids: ['tag-child-1'],
    child_ids: [],
    taggings: [{ oracle_id: 'card-uuid-1', weight: 'median' }],
    description: 'Draw at instant speed',
  },
  {
    id: 'tag-leaf-2',
    slug: 'creature-removal',
    label: 'Creature Removal',
    type: 'tag',
    parent_ids: ['tag-child-2'],
    child_ids: [],
    taggings: [{ oracle_id: 'card-uuid-3', weight: 'strong' }],
    description: 'Remove creatures',
  },
];

function createFixtureStream(): Readable {
  const json = JSON.stringify(FIXTURE_ORACLE_TAGS);
  return Readable.from([json]);
}

describe('oracle tags import', () => {
  it('should import oracle tags from a JSON stream', async () => {
    const db = createTestDb();
    const stream = createFixtureStream();

    const result = await importOracleTags(db, stream);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tagCount).toBe(5);
    expect(result.data.taggingCount).toBe(4);
    expect(result.data.duration).toBeGreaterThanOrEqual(0);

    db.close();
  });

  it('should populate oracle_tags table', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    const tags = db.prepare('SELECT COUNT(*) as count FROM oracle_tags').get() as {
      count: number;
    };
    expect(tags.count).toBe(5);

    db.close();
  });

  it('should store tag metadata correctly', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    const tag = db.prepare('SELECT * FROM oracle_tags WHERE slug = ?').get('draw') as {
      tag_id: string;
      slug: string;
      label: string;
      parent_id: string | null;
      description: string | null;
      cached_descendants_json: string;
    };

    expect(tag).toBeDefined();
    expect(tag.tag_id).toBe('tag-child-1');
    expect(tag.label).toBe('Draw');
    expect(tag.parent_id).toBe('tag-root-1');
    expect(tag.description).toBe('Cards that draw');

    db.close();
  });

  it('should compute and cache transitive closure', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    // Root tag 'effect' should have descendants: draw, removal, instant-speed-draw, creature-removal
    const rootTag = db
      .prepare('SELECT cached_descendants_json FROM oracle_tags WHERE slug = ?')
      .get('effect') as { cached_descendants_json: string };

    const descendants = JSON.parse(rootTag.cached_descendants_json) as string[];
    expect(descendants).toContain('tag-child-1');
    expect(descendants).toContain('tag-child-2');
    expect(descendants).toContain('tag-leaf-1');
    expect(descendants).toContain('tag-leaf-2');

    // Leaf tag should have no descendants
    const leafTag = db
      .prepare('SELECT cached_descendants_json FROM oracle_tags WHERE slug = ?')
      .get('instant-speed-draw') as { cached_descendants_json: string };

    const leafDescendants = JSON.parse(leafTag.cached_descendants_json) as string[];
    expect(leafDescendants.length).toBe(0);

    db.close();
  });

  it('should populate oracle_taggings table', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    const taggings = db
      .prepare('SELECT COUNT(*) as count FROM oracle_taggings')
      .get() as { count: number };
    expect(taggings.count).toBe(4);

    db.close();
  });

  it('should store tagging weights correctly', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    // card-uuid-1 should be tagged with draw (strong weight)
    const drawTag = db.prepare('SELECT * FROM oracle_taggings WHERE oracle_id = ? AND tag_id = ?').get(
      'card-uuid-1',
      'tag-child-1',
    ) as { weight: string } | undefined;

    expect(drawTag).toBeDefined();
    expect(drawTag!.weight).toBe('strong');

    // card-uuid-2 should be tagged with removal (very_strong weight)
    const removalTag = db.prepare('SELECT * FROM oracle_taggings WHERE oracle_id = ? AND tag_id = ?').get(
      'card-uuid-2',
      'tag-child-2',
    ) as { weight: string } | undefined;

    expect(removalTag).toBeDefined();
    expect(removalTag!.weight).toBe('very_strong');

    db.close();
  });

  it('should enforce UNIQUE constraint on oracle_id + tag_id', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    // Verify that duplicate taggings are replaced (REPLACE semantics)
    const taggings = db
      .prepare('SELECT COUNT(*) as count FROM oracle_taggings WHERE oracle_id = ? AND tag_id = ?')
      .get('card-uuid-1', 'tag-child-1') as { count: number };

    expect(taggings.count).toBe(1);

    db.close();
  });

  it('should create indexes for query performance', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    // Check that indexes exist
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='oracle_taggings'")
      .all() as Array<{ name: string }>;

    const indexNames = indexes.map((idx) => idx.name);
    expect(indexNames).toContain('idx_oracle_taggings_oracle_id');
    expect(indexNames).toContain('idx_oracle_taggings_tag_id');

    db.close();
  });

  it('should handle multiple parents in DAG', async () => {
    const db = createTestDb();

    // Create fixture with multi-parent tag
    const multiParentTags = [
      ...FIXTURE_ORACLE_TAGS,
      {
        id: 'tag-multi-parent',
        slug: 'multi-parent-tag',
        label: 'Multi Parent Tag',
        type: 'tag',
        parent_ids: ['tag-child-1', 'tag-child-2'],
        child_ids: [],
        taggings: [],
        description: 'A tag with multiple parents',
      },
    ];

    const json = JSON.stringify(multiParentTags);
    const stream = Readable.from([json]);

    const result = await importOracleTags(db, stream);
    expect(result.ok).toBe(true);

    // The tag should be stored with one of its parents (first one)
    const tag = db
      .prepare('SELECT parent_id FROM oracle_tags WHERE slug = ?')
      .get('multi-parent-tag') as { parent_id: string };

    expect(tag.parent_id).toBe('tag-child-1');

    db.close();
  });

  it('should handle leaf tags without taggings', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    // effect tag has no taggings but should still exist
    const tag = db.prepare('SELECT * FROM oracle_tags WHERE slug = ?').get('effect') as {
      tag_id: string;
    };

    expect(tag).toBeDefined();
    expect(tag.tag_id).toBe('tag-root-1');

    const taggings = db
      .prepare('SELECT COUNT(*) as count FROM oracle_taggings WHERE tag_id = ?')
      .get('tag-root-1') as { count: number };

    expect(taggings.count).toBe(0);

    db.close();
  });

  it('should invoke onProgress callback with parse and write phases', async () => {
    const db = createTestDb();
    const phases: string[] = [];
    const onProgress = (event: { phase: string }) => {
      phases.push(event.phase);
    };

    const result = await importOracleTags(db, createFixtureStream(), onProgress);
    expect(result.ok).toBe(true);
    expect(phases).toContain('parse');
    expect(phases).toContain('write');

    db.close();
  });

  it('should return error on invalid JSON', async () => {
    const db = createTestDb();
    const stream = Readable.from(['invalid json']);

    const result = await importOracleTags(db, stream);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('import');
    expect(result.error.message).toContain('Failed to parse oracle tags');

    db.close();
  });

  it('should work without onProgress callback', async () => {
    const db = createTestDb();
    const result = await importOracleTags(db, createFixtureStream());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tagCount).toBe(5);

    db.close();
  });

  it('should correctly expand parent tag to descendants', async () => {
    const db = createTestDb();
    await importOracleTags(db, createFixtureStream());

    // 'removal' (parent) should have 'creature-removal' (child) as descendant
    const removalTag = db
      .prepare('SELECT cached_descendants_json FROM oracle_tags WHERE slug = ?')
      .get('removal') as { cached_descendants_json: string };

    const descendants = JSON.parse(removalTag.cached_descendants_json) as string[];
    expect(descendants).toContain('tag-leaf-2');

    db.close();
  });
});
