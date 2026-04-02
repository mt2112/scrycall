import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { getCardByName, searchCardsByPrefix, searchCardsBySubstring } from '../../db/queries.js';
import { printCardDetail, printNumberedCardList } from '../../output/display.js';

export function makeCardCommand(): Command {
  const cmd = new Command('card')
    .description('Display detailed information for a specific card')
    .argument('<name>', 'Card name (e.g., "Lightning Bolt")')
    .option('--db <path>', 'Path to database file')
    .action((name: string, options: { db?: string }) => {
      const db = openDatabase(options.db);
      try {
        // 1. Try exact match
        const card = getCardByName(db, name);
        if (card) {
          printCardDetail(card);
          return;
        }

        // 2. Try prefix match
        const prefixResults = searchCardsByPrefix(db, name);
        if (prefixResults.length === 1) {
          printCardDetail(prefixResults[0]);
          return;
        }
        if (prefixResults.length > 1) {
          console.log(`Multiple cards match "${name}":`);
          printNumberedCardList(prefixResults, prefixResults.length);
          return;
        }

        // 3. Try substring match
        const substringResults = searchCardsBySubstring(db, name);
        if (substringResults.cards.length === 1) {
          printCardDetail(substringResults.cards[0]);
          return;
        }
        if (substringResults.cards.length > 1) {
          console.log(`Multiple cards match "${name}":`);
          printNumberedCardList(substringResults.cards, substringResults.totalCount);
          return;
        }

        // 4. No match at all
        console.error(`Card not found: "${name}"`);
        process.exitCode = 1;
      } finally {
        db.close();
      }
    });

  return cmd;
}
