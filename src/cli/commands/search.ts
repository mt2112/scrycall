import { Command } from 'commander';
import { openDatabase } from '../../db/connection.js';
import { search } from '../../search/search.js';
import { printSearchResults } from '../../output/display.js';

export function makeSearchCommand(): Command {
  const cmd = new Command('search')
    .description('Search for cards using Scryfall-like query syntax')
    .argument('<query>', 'Search query (e.g., "c:red t:creature pow>=4")')
    .action((query: string) => {
      const db = openDatabase();
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

        printSearchResults(result.data);
      } finally {
        db.close();
      }
    });

  return cmd;
}
