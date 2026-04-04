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
    `INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, power, toughness, set_code, set_name, rarity, loyalty, scryfall_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  insertCard.run('bolt-1', 'oracle-bolt', 'Lightning Bolt', '{R}', 1, 'Instant', 'Deals 3 damage to any target.', null, null, 'lea', 'Alpha', 'common', null, 'https://scryfall.com/card/lea/161/lightning-bolt');
  insertCard.run('serra-1', 'oracle-serra', 'Serra Angel', '{3}{W}{W}', 5, 'Creature — Angel', 'Flying, vigilance', '4', '4', 'lea', 'Alpha', 'uncommon', null, null);

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

describe('CLI card --open', () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scrycall-open-test-'));
    dbPath = join(tmpDir, 'test.db');
    seedTestDb(dbPath);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('displays card detail with --open flag', () => {
    const { stdout, exitCode } = runCli(['card', 'Lightning Bolt', '--open']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt {R}');
  });

  it('warns when scryfallUri is missing', () => {
    const { stderr } = runCli(['card', 'Serra Angel', '--open']);
    expect(stderr).toContain('Re-import');
  });

  it('still displays card detail without --open', () => {
    const { stdout, exitCode } = runCli(['card', 'Lightning Bolt']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt {R}');
  });
});
