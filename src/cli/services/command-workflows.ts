import type Database from 'better-sqlite3';
import { openDatabase } from '../../db/connection.js';
import {
  getCardByName,
  searchCardsByPrefix,
  searchCardsBySubstring,
  searchSets,
} from '../../db/queries.js';
import { runImport } from '../../import/index.js';
import type { Card, ImportProgressEvent, SetRecord } from '../../models/index.js';
import { search } from '../../search/search.js';

const PHASE_MESSAGES: Record<ImportProgressEvent['phase'], string> = {
  manifest: 'Fetching card catalog...',
  download: 'Downloading card data...',
  parse: 'Parsing cards...',
  write: 'Writing to database...',
  index: 'Rebuilding search index...',
};

type WriteLine = (line: string) => void;
type OpenInBrowser = (url: string) => void;
type PromptForSelection = (
  cards: readonly Card[],
  onSelect: (card: Card) => void,
  onOpen?: (card: Card) => void,
) => Promise<void>;

interface SearchWorkflowOptions {
  readonly query: string;
  readonly dbPath?: string;
  readonly open?: boolean;
  readonly interactive?: boolean;
  readonly isInteractiveTerminal: boolean;
}

interface SearchWorkflowDeps {
  readonly openDatabase?: (dbPath?: string) => Database.Database;
  readonly search?: typeof search;
  readonly getCardByName?: typeof getCardByName;
  readonly printSearchResults: (cards: readonly Card[]) => void;
  readonly printNumberedSearchResults: (cards: readonly Card[]) => void;
  readonly printCardDetail: (card: Card) => void;
  readonly promptForSelection: PromptForSelection;
  readonly openInBrowser: OpenInBrowser;
  readonly writeLine?: WriteLine;
  readonly writeErrorLine?: WriteLine;
}

interface CardWorkflowOptions {
  readonly name: string;
  readonly dbPath?: string;
  readonly open?: boolean;
}

interface CardWorkflowDeps {
  readonly openDatabase?: (dbPath?: string) => Database.Database;
  readonly getCardByName?: typeof getCardByName;
  readonly searchCardsByPrefix?: typeof searchCardsByPrefix;
  readonly searchCardsBySubstring?: typeof searchCardsBySubstring;
  readonly printCardDetail: (card: Card) => void;
  readonly printNumberedCardList: (cards: readonly Card[], totalCount: number) => void;
  readonly openInBrowser: OpenInBrowser;
  readonly writeLine?: WriteLine;
  readonly writeErrorLine?: WriteLine;
}

interface ImportWorkflowOptions {
  readonly force?: boolean;
  readonly dbPath?: string;
}

interface ImportWorkflowDeps {
  readonly openDatabase?: (dbPath?: string) => Database.Database;
  readonly runImport?: typeof runImport;
  readonly writeLine?: WriteLine;
  readonly writeErrorLine?: WriteLine;
}

interface SetsWorkflowOptions {
  readonly term?: string;
  readonly dbPath?: string;
  readonly years?: number[];
  readonly types?: string[];
  readonly includeAll?: boolean;
}

interface SetsWorkflowDeps {
  readonly openDatabase?: (dbPath?: string) => Database.Database;
  readonly searchSets?: typeof searchSets;
  readonly printSets: (sets: SetRecord[]) => void;
  readonly writeLine?: WriteLine;
  readonly writeErrorLine?: WriteLine;
}

function defaultWriteLine(line: string): void {
  console.log(line);
}

function defaultWriteErrorLine(line: string): void {
  console.error(line);
}

function openCardPage(card: Card, openCardInBrowser: OpenInBrowser, writeErrorLine: WriteLine): void {
  if (card.scryfallUri) {
    openCardInBrowser(card.scryfallUri);
  } else {
    writeErrorLine('Scryfall URI not available. Re-import cards to enable --open.');
  }
}

export async function runSearchCommandWorkflow(
  options: SearchWorkflowOptions,
  deps: SearchWorkflowDeps,
): Promise<number> {
  const openDb = deps.openDatabase ?? openDatabase;
  const runSearch = deps.search ?? search;
  const loadCardByName = deps.getCardByName ?? getCardByName;
  const writeLine = deps.writeLine ?? defaultWriteLine;
  const writeErrorLine = deps.writeErrorLine ?? defaultWriteErrorLine;

  const db = openDb(options.dbPath);
  try {
    const result = runSearch(db, options.query);
    if (!result.ok) {
      if (result.error.kind === 'parse') {
        writeErrorLine(`Parse error: ${result.error.message} (at position ${result.error.position})`);
      } else {
        writeErrorLine(`Error: ${result.error.message}`);
      }
      return 1;
    }

    if (options.open) {
      const scryfallUrl = `https://scryfall.com/search?q=${encodeURIComponent(options.query)}&unique=cards&as=grid`;
      deps.openInBrowser(scryfallUrl);
      writeErrorLine('Opened Scryfall search in browser.');
      return 0;
    }

    if (options.interactive && options.isInteractiveTerminal && result.data.length > 0) {
      deps.printNumberedSearchResults(result.data);
      await deps.promptForSelection(
        result.data,
        (card) => {
          const detail = loadCardByName(db, card.name);
          if (detail) {
            writeLine('');
            deps.printCardDetail(detail);
            writeLine('');
          }
        },
        (card) => {
          if (card.scryfallUri) {
            deps.openInBrowser(card.scryfallUri);
          } else {
            writeErrorLine('Scryfall URI not available. Re-import cards to enable opening.');
          }
        },
      );
      return 0;
    }

    deps.printSearchResults(result.data);
    return 0;
  } finally {
    db.close();
  }
}

export function runCardCommandWorkflow(
  options: CardWorkflowOptions,
  deps: CardWorkflowDeps,
): number {
  const openDb = deps.openDatabase ?? openDatabase;
  const loadCardByName = deps.getCardByName ?? getCardByName;
  const loadPrefixMatches = deps.searchCardsByPrefix ?? searchCardsByPrefix;
  const loadSubstringMatches = deps.searchCardsBySubstring ?? searchCardsBySubstring;
  const writeLine = deps.writeLine ?? defaultWriteLine;
  const writeErrorLine = deps.writeErrorLine ?? defaultWriteErrorLine;

  const db = openDb(options.dbPath);
  try {
    const card = loadCardByName(db, options.name);
    if (card) {
      deps.printCardDetail(card);
      if (options.open) {
        openCardPage(card, deps.openInBrowser, writeErrorLine);
      }
      return 0;
    }

    const prefixResults = loadPrefixMatches(db, options.name);
    if (prefixResults.length === 1) {
      deps.printCardDetail(prefixResults[0]);
      if (options.open) {
        openCardPage(prefixResults[0], deps.openInBrowser, writeErrorLine);
      }
      return 0;
    }

    if (prefixResults.length > 1) {
      writeLine(`Multiple cards match "${options.name}":`);
      deps.printNumberedCardList(prefixResults, prefixResults.length);
      return 0;
    }

    const substringResults = loadSubstringMatches(db, options.name);
    if (substringResults.cards.length === 1) {
      deps.printCardDetail(substringResults.cards[0]);
      if (options.open) {
        openCardPage(substringResults.cards[0], deps.openInBrowser, writeErrorLine);
      }
      return 0;
    }

    if (substringResults.cards.length > 1) {
      writeLine(`Multiple cards match "${options.name}":`);
      deps.printNumberedCardList(substringResults.cards, substringResults.totalCount);
      return 0;
    }

    writeErrorLine(`Card not found: "${options.name}"`);
    return 1;
  } finally {
    db.close();
  }
}

export async function runImportCommandWorkflow(
  options: ImportWorkflowOptions,
  deps: ImportWorkflowDeps = {},
): Promise<number> {
  const openDb = deps.openDatabase ?? openDatabase;
  const runImportFn = deps.runImport ?? runImport;
  const writeLine = deps.writeLine ?? defaultWriteLine;
  const writeErrorLine = deps.writeErrorLine ?? defaultWriteErrorLine;

  if (options.force) {
    writeErrorLine('Import failed: --force is not currently supported; run scrycall import without --force.');
    return 1;
  }

  const db = openDb(options.dbPath);
  try {
    const result = await runImportFn(db, {
      force: options.force,
      onProgress: (event) => {
        writeLine(PHASE_MESSAGES[event.phase]);
      },
    });

    if (!result.ok) {
      writeErrorLine(`Import failed: ${result.error.message}`);
      return 1;
    }

    writeLine(
      `Import complete: ${result.data.cardCount} cards imported in ${(result.data.duration / 1000).toFixed(1)}s`,
    );
    return 0;
  } finally {
    db.close();
  }
}

export function runSetsCommandWorkflow(
  options: SetsWorkflowOptions,
  deps: SetsWorkflowDeps,
): number {
  const openDb = deps.openDatabase ?? openDatabase;
  const searchSetsFn = deps.searchSets ?? searchSets;
  const writeLine = deps.writeLine ?? defaultWriteLine;
  const writeErrorLine = deps.writeErrorLine ?? defaultWriteErrorLine;

  const db = openDb(options.dbPath);
  try {
    const emptyCheck = db.prepare('SELECT COUNT(*) as cnt FROM sets').get() as { cnt: number };
    if (emptyCheck.cnt === 0) {
      writeErrorLine('Sets database is empty. Run `scrycall import` to populate it.');
      return 1;
    }

    const sets = searchSetsFn(db, options.term, {
      years: options.years,
      types: options.types,
      includeAll: options.includeAll,
    });

    if (sets.length === 0) {
      writeLine('No sets found.');
      return 0;
    }

    deps.printSets(sets);
    return 0;
  } finally {
    db.close();
  }
}