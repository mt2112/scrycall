import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { runImport } from '../../import/index.js';

export function makeImportCommand(): Command {
  const cmd = new Command('import')
    .description('Download and import Scryfall bulk card data')
    .option('--force', 'Re-download even if data is recent')
    .action(async (options: { force?: boolean }) => {
      console.log('Fetching Scryfall bulk data...');

      const db = openDatabase();
      try {
        const result = await runImport(db, { force: options.force });
        if (!result.ok) {
          console.error(`Import failed: ${result.error.message}`);
          process.exitCode = 1;
          return;
        }

        console.log(
          `Import complete: ${result.data.cardCount} cards imported in ${(result.data.duration / 1000).toFixed(1)}s`,
        );
      } finally {
        db.close();
      }
    });

  return cmd;
}
