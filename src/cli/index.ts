#!/usr/bin/env node

import { Command } from 'commander';
import { openDatabase } from '../db/connection.js';
import { makeImportCommand } from './commands/import.js';
import { makeSearchCommand } from './commands/search.js';
import { makeCardCommand } from './commands/card.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('scrycall')
    .description('Offline Magic: The Gathering card search CLI')
    .version('0.1.0');

  program.addCommand(makeImportCommand());
  program.addCommand(makeSearchCommand());
  program.addCommand(makeCardCommand());

  return program;
}

const program = createProgram();
program.parse();
