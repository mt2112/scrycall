import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import { makeSetsCommand, normalizeMultiValueOption } from '../../src/cli/commands/sets.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../../src/db/migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'test-sets-cli.db');

describe('sets command', () => {
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
    db.close();
  });

  afterAll(() => {
    try {
      require('fs').unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it('should create a command', () => {
    const cmd = makeSetsCommand();
    expect(cmd.name()).toBe('sets');
  });

  it('should have correct description', () => {
    const cmd = makeSetsCommand();
    expect(cmd.description()).toContain('Magic: The Gathering sets');
  });

  it('should have --year option', () => {
    const cmd = makeSetsCommand();
    const help = cmd.helpInformation();
    expect(help).toContain('--year');
  });

  it('should have --type option', () => {
    const cmd = makeSetsCommand();
    const help = cmd.helpInformation();
    expect(help).toContain('--type');
  });

  it('should have --all option', () => {
    const cmd = makeSetsCommand();
    const help = cmd.helpInformation();
    expect(help).toContain('--all');
  });

  it('should have optional [term] argument', () => {
    const cmd = makeSetsCommand();
    const help = cmd.helpInformation();
    expect(help).toContain('[term]');
  });

  it('should normalize comma-separated option values', () => {
    expect(normalizeMultiValueOption('2003,2004,2005')).toEqual(['2003', '2004', '2005']);
  });

  it('should normalize PowerShell-style split option values', () => {
    expect(normalizeMultiValueOption(['2003', '2004', '2005'])).toEqual([
      '2003',
      '2004',
      '2005',
    ]);
  });

  it('should normalize mixed comma-separated and split option values', () => {
    expect(normalizeMultiValueOption(['2003,2004', '2005'])).toEqual(['2003', '2004', '2005']);
  });

  it('should normalize space-separated values inside a single argument', () => {
    expect(normalizeMultiValueOption('2003 2004 2005')).toEqual(['2003', '2004', '2005']);
  });
});
