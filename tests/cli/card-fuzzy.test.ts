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

  insertCard.run('bolt-1', 'oracle-bolt', 'Lightning Bolt', '{R}', 1, 'Instant', 'Deals 3 damage to any target.', null, null, 'lea', 'Alpha', 'common', null);
  insertCard.run('helix-1', 'oracle-helix', 'Lightning Helix', '{R}{W}', 2, 'Instant', 'Deals 3 damage and you gain 3 life.', null, null, 'rav', 'Ravnica', 'uncommon', null);
  insertCard.run('strike-1', 'oracle-strike', 'Lightning Strike', '{1}{R}', 2, 'Instant', 'Deals 3 damage to any target.', null, null, 'ths', 'Theros', 'common', null);
  insertCard.run('serra-1', 'oracle-serra', 'Serra Angel', '{3}{W}{W}', 5, 'Creature — Angel', 'Flying, vigilance', '4', '4', 'lea', 'Alpha', 'uncommon', null);

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

describe('CLI card fuzzy match', () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scrycall-fuzzy-test-'));
    dbPath = join(tmpDir, 'test.db');
    seedTestDb(dbPath);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exact match still works', () => {
    const { stdout, exitCode } = runCli(['card', 'Lightning Bolt']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt {R}');
    expect(stdout).toContain('Instant');
  });

  it('single prefix match auto-selects', () => {
    const { stdout, exitCode } = runCli(['card', 'Serra']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Serra Angel');
    expect(stdout).toContain('Creature — Angel');
  });

  it('multiple prefix matches show numbered list', () => {
    const { stdout, exitCode } = runCli(['card', 'Lightning']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Multiple cards match');
    expect(stdout).toContain('1. Lightning Bolt');
    expect(stdout).toContain('2. Lightning Helix');
    expect(stdout).toContain('3. Lightning Strike');
  });

  it('substring match works when prefix fails', () => {
    const { stdout, exitCode } = runCli(['card', 'Bolt']);
    expect(exitCode).toBe(0);
    // "Bolt" doesn't prefix-match anything, but substring-matches "Lightning Bolt"
    expect(stdout).toContain('Lightning Bolt');
  });

  it('no match shows error', () => {
    const { stderr, exitCode } = runCli(['card', 'Xyzzyplugh']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Card not found');
  });
});
