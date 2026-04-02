import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { search } from '../../search/search.js';
import { getCardByName } from '../../db/queries.js';
import { printSearchResults, printNumberedSearchResults, printCardDetail } from '../../output/display.js';
import type { Card } from '../../models/index.js';

export function promptForSelection(
  cards: readonly Card[],
  onSelect: (card: Card) => void,
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  return new Promise<void>((resolve) => {
    function ask(): void {
      rl.question('Enter card number (q to quit): ', (answer) => {
        const trimmed = answer.trim();

        if (trimmed === '' || trimmed === 'q') {
          rl.close();
          resolve();
          return;
        }

        const num = Number(trimmed);
        if (!Number.isInteger(num) || num < 1 || num > cards.length) {
          console.error(`Invalid selection. Enter 1-${cards.length} or q to quit.`);
          ask();
          return;
        }

        onSelect(cards[num - 1]);
        ask();
      });
    }

    ask();
  });
}

export function makeSearchCommand(): Command {
  const cmd = new Command('search')
    .description('Search for cards using Scryfall-like query syntax')
    .argument('<query>', 'Search query (e.g., "c:red t:creature pow>=4")')
    .option('--db <path>', 'Path to database file')
    .action(async (query: string, options: { db?: string }) => {
      const db = openDatabase(options.db);
      try {
        const result = search(db, query);
        if (!result.ok) {
          if (result.error.kind === 'parse') {
            console.error(`Parse error: ${result.error.message} (at position ${result.error.position})`);
          } else {
            console.error(`Error: ${result.error.message}`);
          }
          process.exitCode = 1;
          return;
        }

        if (process.stdout.isTTY && result.data.length > 0) {
          printNumberedSearchResults(result.data);
          await promptForSelection(result.data, (card) => {
            const detail = getCardByName(db, card.name);
            if (detail) {
              console.log('');
              printCardDetail(detail);
              console.log('');
            }
          });
        } else {
          printSearchResults(result.data);
        }
      } finally {
        db.close();
      }
    });

  return cmd;
}
