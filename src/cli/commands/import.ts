import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { runImport } from '../../import/index.js';
import type { ImportProgressEvent } from '../../models/index.js';

const PHASE_MESSAGES: Record<ImportProgressEvent['phase'], string> = {
  manifest: 'Fetching card catalog...',
  download: 'Downloading card data...',
  parse: 'Parsing cards...',
  write: 'Writing to database...',
  index: 'Rebuilding search index...',
};

export function makeImportCommand(): Command {
  const cmd = new Command('import')
    .description('Download and import Scryfall bulk card data')
    .option('--force', 'Re-download even if data is recent')
    .action(async (options: { force?: boolean }) => {
      const db = openDatabase();
      try {
        const result = await runImport(db, {
          force: options.force,
          onProgress: (event) => {
            console.log(PHASE_MESSAGES[event.phase]);
          },
        });
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
