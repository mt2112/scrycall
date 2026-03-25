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
  const insertIdentity = db.prepare('INSERT INTO card_color_identity (card_id, color) VALUES (?, ?)');
  const insertKeyword = db.prepare('INSERT INTO card_keywords (card_id, keyword) VALUES (?, ?)');
  const insertLegality = db.prepare('INSERT INTO card_legalities (card_id, format, status) VALUES (?, ?, ?)');

  // Lightning Bolt
  insertCard.run('bolt-1', 'oracle-bolt', 'Lightning Bolt', '{R}', 1, 'Instant', 'Lightning Bolt deals 3 damage to any target.', null, null, 'lea', 'Alpha', 'common', null);
  insertColor.run('bolt-1', 'R');
  insertIdentity.run('bolt-1', 'R');
  insertLegality.run('bolt-1', 'modern', 'legal');

  // Serra Angel
  insertCard.run('serra-1', 'oracle-serra', 'Serra Angel', '{3}{W}{W}', 5, 'Creature — Angel', 'Flying, vigilance', '4', '4', 'lea', 'Alpha', 'uncommon', null);
  insertColor.run('serra-1', 'W');
  insertIdentity.run('serra-1', 'W');
  insertKeyword.run('serra-1', 'Flying');
  insertKeyword.run('serra-1', 'Vigilance');
  insertLegality.run('serra-1', 'modern', 'legal');

  // Nicol Bolas
  insertCard.run('bolas-1', 'oracle-bolas', 'Nicol Bolas', '{2}{U}{B}{R}', 5, 'Legendary Creature — Elder Dragon', 'Flying', '7', '7', 'leg', 'Legends', 'rare', null);
  insertColor.run('bolas-1', 'U');
  insertColor.run('bolas-1', 'B');
  insertColor.run('bolas-1', 'R');
  insertIdentity.run('bolas-1', 'U');
  insertIdentity.run('bolas-1', 'B');
  insertIdentity.run('bolas-1', 'R');
  insertKeyword.run('bolas-1', 'Flying');
  insertLegality.run('bolas-1', 'legacy', 'legal');

  // Karn Liberated — planeswalker
  insertCard.run('karn-1', 'oracle-karn', 'Karn Liberated', '{7}', 7, 'Legendary Planeswalker — Karn', '+4: Target player exiles a card from their hand.', null, null, 'nph', 'New Phyrexia', 'mythic', '6');
  insertLegality.run('karn-1', 'modern', 'legal');

  db.close();
}

/** Run the CLI and return stdout */
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

describe('CLI search command', () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scrycall-test-'));
    dbPath = join(tmpDir, 'test.db');
    seedTestDb(dbPath);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('search "c:red" — lists red cards with count', () => {
    const { stdout, exitCode } = runCli(['search', 'c:red']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt');
    expect(stdout).toContain('Nicol Bolas');
    expect(stdout).toContain('2 cards found.');
  });

  it('search "c:red t:creature" — combined color + type', () => {
    const { stdout, exitCode } = runCli(['search', 'c:red t:creature']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Nicol Bolas');
    expect(stdout).not.toContain('Lightning Bolt');
    expect(stdout).toContain('1 card found.');
  });

  it('search "t:instant or t:sorcery" — OR query', () => {
    const { stdout, exitCode } = runCli(['search', 't:instant or t:sorcery']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt');
    expect(stdout).toContain('1 card found.');
  });

  it('search "t:planeswalker" — finds Karn with correct format', () => {
    const { stdout, exitCode } = runCli(['search', 't:planeswalker']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Karn Liberated');
    expect(stdout).toContain('Planeswalker');
  });

  it('search with no results — shows "No cards found."', () => {
    const { stdout, exitCode } = runCli(['search', 't:enchantment']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('No cards found.');
  });

  it('search with invalid query — shows parse error', () => {
    const { stderr, exitCode } = runCli(['search', '(unclosed']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Parse error');
  });

  it('card "Lightning Bolt" — shows detailed card info', () => {
    const { stdout, exitCode } = runCli(['card', 'Lightning Bolt']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Lightning Bolt {R}');
    expect(stdout).toContain('Instant');
    expect(stdout).toContain('deals 3 damage');
    expect(stdout).toContain('Alpha (LEA)');
    expect(stdout).toContain('Common');
  });

  it('card not found — shows error', () => {
    const { stderr, exitCode } = runCli(['card', 'Nonexistent Card']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Card not found');
  });
});
