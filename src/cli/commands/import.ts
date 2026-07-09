import { Command } from 'commander';
import { runImportCommandWorkflow } from '../services/index.js';

export function makeImportCommand(): Command {
  const cmd = new Command('import')
    .description('Download and import Scryfall bulk card data')
    .option('--force', 'Re-download even if data is recent')
    .action(async (options: { force?: boolean }) => {
      const exitCode = await runImportCommandWorkflow({ force: options.force });
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  return cmd;
}
