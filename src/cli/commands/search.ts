import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { printSearchResults, printNumberedSearchResults, printCardDetail } from '../../output/display.js';
import { openInBrowser } from '../../utils/browser.js';
import type { Card } from '../../models/index.js';
import { runSearchCommandWorkflow } from '../services/index.js';

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
    .option('-i, --interactive', 'Show numbered results with interactive selection prompt')
    .action(async (query: string, options: { db?: string; open?: boolean; interactive?: boolean }) => {
      const exitCode = await runSearchCommandWorkflow(
        {
          query,
          dbPath: options.db,
          open: options.open,
          interactive: options.interactive,
          isInteractiveTerminal: process.stdout.isTTY,
        },
        {
          printSearchResults,
          printNumberedSearchResults,
          printCardDetail,
          promptForSelection,
          openInBrowser,
        },
      );

      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  return cmd;
}
