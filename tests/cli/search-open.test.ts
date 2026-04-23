import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
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
  const result = spawnSync('node', ['dist/cli/index.js', ...args, '--db', dbPath], {
    encoding: 'utf-8',
    cwd: join(import.meta.dirname, '..', '..'),
    timeout: 10000,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
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

  it('opens browser without displaying results with --open flag', () => {
    const { stdout, stderr, exitCode } = runCli(['search', 'c:red', '--open']);
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toContain('Opened Scryfall search in browser.');
  });

  it('still works without --open flag', () => {
    const { stdout, exitCode } = runCli(['search', 'c:red']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt');
  });

  it('shows parse error and does not open browser with --open flag', () => {
    const { stdout, stderr, exitCode } = runCli(['search', '(unclosed', '--open']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Parse error');
    expect(stderr).not.toContain('Opened Scryfall search in browser.');
    expect(stdout).toBe('');
  });

  it('--open takes precedence over -i', () => {
    const { stdout, stderr, exitCode } = runCli(['search', 'c:red', '--open', '-i']);
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toContain('Opened Scryfall search in browser.');
    // No interactive prompt or numbered output
    expect(stdout).not.toContain('Enter card number');
  });
});
