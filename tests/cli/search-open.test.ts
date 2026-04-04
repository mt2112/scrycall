import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/db/migrations.js';

let tmpDir: string;
let dbPath: string;

function seedTestDb(dbPath: string): void {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  runMigrations(db);

  const insertCard = db.prepare(
    `INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, power, toughness, set_code, set_name, rarity, loyalty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertColor = db.prepare('INSERT INTO card_colors (card_id, color) VALUES (?, ?)');

  insertCard.run('bolt-1', 'oracle-bolt', 'Lightning Bolt', '{R}', 1, 'Instant', 'Lightning Bolt deals 3 damage to any target.', null, null, 'lea', 'Alpha', 'common', null);
  insertColor.run('bolt-1', 'R');

  db.close();
}

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', ['dist/cli/index.js', ...args, '--db', dbPath], {
      encoding: 'utf-8',
      cwd: join(import.meta.dirname, '..', '..'),
      timeout: 10000,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.status ?? 1,
    };
  }
}

describe('CLI search --open', () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scrycall-search-open-test-'));
    dbPath = join(tmpDir, 'test.db');
    seedTestDb(dbPath);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('displays search results with --open flag', () => {
    const { stdout, exitCode } = runCli(['search', 'c:red', '--open']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt');
  });

  it('still works without --open flag', () => {
    const { stdout, exitCode } = runCli(['search', 'c:red']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt');
  });
});
