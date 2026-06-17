import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { searchSets } from '../../db/queries.js';
import type { SetRecord } from '../../models/index.js';

export function normalizeMultiValueOption(
  value: string | string[] | undefined,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const normalized = values
    .flatMap((item) => item.split(/[\s,]+/))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}

function formatSetRow(set: SetRecord): string {
  const code = (set.code ?? '').toUpperCase().padEnd(5);
  const name = (set.name ?? '').substring(0, 40).padEnd(40);
  const year = set.released_at ? set.released_at.substring(0, 4) : '    ';
  const type = set.set_type ?? '';
  return `${code}  ${name}  ${year}  ${type}`;
}

function printSets(sets: SetRecord[]): void {
  if (sets.length === 0) {
    return;
  }

  // Print header
  console.log('CODE  Set Name                              YEAR  Type');
  console.log('----  ' + '-'.repeat(34) + '  ----  ----');

  for (const set of sets) {
    console.log(formatSetRow(set));
  }
}

export function makeSetsCommand(): Command {
  const cmd = new Command('sets')
    .description('Search for Magic: The Gathering sets')
    .argument('[term]', 'Search term (name, code, or year)')
    .option(
      '--year <years...>',
      'Filter by year(s) (comma-separated or space-separated, e.g., 2021,2022 or 2021 2022)',
    )
    .option('--type <types...>', 'Filter by set type(s) (comma-separated or space-separated)')
    .option('--all', 'Show all set types including tokens, promos, and memorabilia')
    .action(
      async (
        term: string | undefined,
        options: { year?: string | string[]; type?: string | string[]; all?: boolean },
      ) => {
        const db = openDatabase();
        try {
          // Check if sets table is empty
          const emptyCheck = db
            .prepare('SELECT COUNT(*) as cnt FROM sets')
            .get() as { cnt: number };

          if (emptyCheck.cnt === 0) {
            console.error('Sets database is empty. Run `scrycall import` to populate it.');
            process.exitCode = 1;
            return;
          }

          // Parse options
          const years = normalizeMultiValueOption(options.year)?.map((year) => parseInt(year, 10));
          const types = normalizeMultiValueOption(options.type);

          // If no term and no filters, show help
          if (!term && !years && !types) {
            cmd.help();
            return;
          }

          // Search sets
          const sets = searchSets(db, term, {
            years,
            types,
            includeAll: options.all,
          });

          if (sets.length === 0) {
            console.log('No sets found.');
            return;
          }

          printSets(sets);
        } finally {
          db.close();
        }
      },
    );

  return cmd;
}
