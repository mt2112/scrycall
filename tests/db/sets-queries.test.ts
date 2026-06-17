import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { searchSets } from '../../src/db/queries.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../../src/db/migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'test-sets.db');

describe('sets queries', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(dbPath);
    runMigrations(db);

    // Insert test sets
    const insertSet = db.prepare(
      'INSERT OR IGNORE INTO sets (code, name, released_at, set_type) VALUES (?, ?, ?, ?)',
    );
    insertSet.run('stx', 'Strixhaven: School of Mages', '2021-04-23', 'expansion');
    insertSet.run('sta', 'Strixhaven Mystical Archive', '2021-04-23', 'masterpiece');
    insertSet.run('c21', 'Commander 2021', '2021-08-24', 'commander');
    insertSet.run('token', 'Strixhaven Tokens', '2021-04-23', 'token');
    insertSet.run('afr', 'Adventures in the Forgotten Realms', '2021-07-23', 'expansion');
    insertSet.run('mh2', 'Modern Horizons 2', '2021-06-18', 'expansion');
  });

  afterAll(() => {
    db.close();
    try {
      require('fs').unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it('should search by name', () => {
    const results = searchSets(db, 'strixhaven');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((s) => s.code === 'stx')).toBe(true);
    expect(results.some((s) => s.code === 'sta')).toBe(true);
  });

  it('should search by year', () => {
    const results = searchSets(db, '2021');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.released_at?.startsWith('2021'))).toBe(true);
  });

  it('should search by exact set code', () => {
    const results = searchSets(db, 'stx');
    const stxSet = results.find((s) => s.code === 'stx');
    expect(stxSet).toBeDefined();
    expect(stxSet?.name).toBe('Strixhaven: School of Mages');
  });

  it('should hide noisy types by default', () => {
    const results = searchSets(db, 'strixhaven');
    expect(results.some((s) => s.set_type === 'token')).toBe(false);
  });

  it('should show all types with --all flag', () => {
    const results = searchSets(db, 'strixhaven', { includeAll: true });
    expect(results.some((s) => s.set_type === 'token')).toBe(true);
  });

  it('should filter by type', () => {
    const results = searchSets(db, undefined, { types: ['expansion'] });
    expect(results.every((s) => s.set_type === 'expansion')).toBe(true);
  });

  it('should filter by year option', () => {
    const results = searchSets(db, undefined, { years: [2021] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.released_at?.startsWith('2021'))).toBe(true);
  });

  it('should sort by release date then code', () => {
    const results = searchSets(db, undefined, { includeAll: true });
    // Check that results are sorted by released_at then code
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      if (prev.released_at === curr.released_at) {
        expect(prev.code.localeCompare(curr.code)).toBeLessThanOrEqual(0);
      } else if (prev.released_at && curr.released_at) {
        expect(prev.released_at.localeCompare(curr.released_at)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('should return empty array for no matches', () => {
    const results = searchSets(db, 'nonexistent');
    expect(results.length).toBe(0);
  });

  it('should handle comma-separated years', () => {
    const results = searchSets(db, undefined, { years: [2021] });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle comma-separated types', () => {
    const results = searchSets(db, undefined, { types: ['expansion', 'commander'] });
    expect(results.every((s) => ['expansion', 'commander'].includes(s.set_type ?? ''))).toBe(true);
  });
});
