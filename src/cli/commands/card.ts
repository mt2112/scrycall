import { Command } from 'commander';
import { printCardDetail, printNumberedCardList } from '../../output/display.js';
import { openInBrowser } from '../../utils/browser.js';
import { runCardCommandWorkflow } from '../services/index.js';

export function makeCardCommand(): Command {
  const cmd = new Command('card')
    .description('Display detailed information for a specific card')
    .argument('<name>', 'Card name (e.g., "Lightning Bolt")')
    .option('--db <path>', 'Path to database file')
    .option('--open', 'Open the card on Scryfall in your browser')
    .action((name: string, options: { db?: string; open?: boolean }) => {
      const exitCode = runCardCommandWorkflow(
        {
          name,
          dbPath: options.db,
          open: options.open,
        },
        {
          printCardDetail,
          printNumberedCardList,
          openInBrowser,
        },
      );

      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  return cmd;
}
