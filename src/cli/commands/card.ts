import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { getCardByName } from '../../db/queries.js';
import { printCardDetail } from '../../output/display.js';

export function makeCardCommand(): Command {
  const cmd = new Command('card')
    .description('Display detailed information for a specific card')
    .argument('<name>', 'Card name (e.g., "Lightning Bolt")')
    .option('--db <path>', 'Path to database file')
    .action((name: string, options: { db?: string }) => {
      const db = openDatabase(options.db);
      try {
        const card = getCardByName(db, name);
        if (!card) {
          console.error(`Card not found: "${name}"`);
          process.exitCode = 1;
          return;
        }

        printCardDetail(card);
      } finally {
        db.close();
      }
    });

  return cmd;
}
