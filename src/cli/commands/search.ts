import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { search } from '../../search/search.js';
import { getCardByName } from '../../db/queries.js';
import { printSearchResults, printNumberedSearchResults, printCardDetail } from '../../output/display.js';
import { openInBrowser } from '../../utils/browser.js';
import type { Card } from '../../models/index.js';

export function promptForSelection(
  cards: readonly Card[],
  onSelect: (card: Card) => void,
  onOpen?: (card: Card) => void,
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  return new Promise<void>((resolve) => {
    function ask(): void {
      rl.question('Enter card number (o to open, q to quit): ', (answer) => {
        const trimmed = answer.trim();

        if (trimmed === '' || trimmed === 'q') {
          rl.close();
          resolve();
          return;
        }

        // Handle o{N} pattern for opening in browser
        const openMatch = /^o(\d+)$/i.exec(trimmed);
        if (openMatch) {
          const num = Number(openMatch[1]);
          if (!Number.isInteger(num) || num < 1 || num > cards.length) {
            console.error(`Invalid selection. Enter 1-${cards.length} or q to quit.`);
            ask();
            return;
          }
          if (onOpen) {
            onOpen(cards[num - 1]);
          }
          ask();
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
    .option('--open', 'Open search results on Scryfall in your browser')
    .action(async (query: string, options: { db?: string; open?: boolean }) => {
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
          await promptForSelection(
            result.data,
            (card) => {
              const detail = getCardByName(db, card.name);
              if (detail) {
                console.log('');
                printCardDetail(detail);
                console.log('');
              }
            },
            (card) => {
              if (card.scryfallUri) {
                openInBrowser(card.scryfallUri);
              } else {
                console.error('Scryfall URI not available. Re-import cards to enable opening.');
              }
            },
          );
        } else {
          printSearchResults(result.data);
        }

        if (options.open) {
          const scryfallUrl = `https://scryfall.com/search?q=${encodeURIComponent(query)}&unique=cards&as=grid`;
          openInBrowser(scryfallUrl);
        }
      } finally {
        db.close();
      }
    });

  return cmd;
}
