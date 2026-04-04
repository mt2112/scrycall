import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/db/migrations.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}

describe('database connection', () => {
  it('should apply migrations to a fresh database', () => {
    const db = createTestDb();
    runMigrations(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('cards');
    expect(tableNames).toContain('card_colors');
    expect(tableNames).toContain('card_color_identity');
    expect(tableNames).toContain('card_keywords');
    expect(tableNames).toContain('card_legalities');
    expect(tableNames).toContain('_migrations');

    db.close();
  });

  it('should track applied migrations', () => {
    const db = createTestDb();
    runMigrations(db);

    const migrations = db.prepare('SELECT version FROM _migrations').all() as {
      version: string;
    }[];
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0].version).toBe('001-initial-schema');

    db.close();
  });

  it('should not reapply migrations on second run', () => {
    const db = createTestDb();
    runMigrations(db);
    runMigrations(db);

    const migrations = db.prepare('SELECT version FROM _migrations').all() as {
      version: string;
    }[];
    expect(migrations).toHaveLength(2);

    db.close();
  });

  it('should have FTS5 virtual table', () => {
    const db = createTestDb();
    runMigrations(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cards_fts'")
      .all();
    expect(tables).toHaveLength(1);

    db.close();
  });
});
