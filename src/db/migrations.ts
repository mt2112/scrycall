import type Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_DIR = join(__dirname, 'migrations');

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM _migrations ORDER BY version')
      .all()
      .map((row) => (row as { version: string }).version),
  );

  let files: string[];
  try {
    files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    return;
  }

  const applyMigration = db.transaction((version: string, sql: string) => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(version);
  });

  for (const file of files) {
    const version = file.replace('.sql', '');
    if (applied.has(version)) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    applyMigration(version, sql);
  }
}
