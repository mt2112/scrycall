import { describe, expect, it, vi } from 'vitest';
import type Database from 'better-sqlite3';
import type { Card, SetRecord } from '../../src/models/index.js';
import {
  runCardCommandWorkflow,
  runImportCommandWorkflow,
  runSearchCommandWorkflow,
  runSetsCommandWorkflow,
} from '../../src/cli/services/index.js';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    oracleId: 'oracle-1',
    name: 'Lightning Bolt',
    manaCost: '{R}',
    cmc: 1,
    typeLine: 'Instant',
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    power: null,
    toughness: null,
    colors: ['R'],
    colorIdentity: ['R'],
    keywords: [],
    set: 'lea',
    setName: 'Alpha',
    rarity: 'common',
    legalities: {},
    loyalty: null,
    scryfallUri: 'https://scryfall.com/card/lea/161/lightning-bolt',
    ...overrides,
  };
}

function makeDbStub(overrides: Partial<Database.Database> = {}): Database.Database {
  return {
    close: vi.fn(),
    prepare: vi.fn(),
    ...overrides,
  } as unknown as Database.Database;
}

describe('command workflows', () => {
  it('runs search workflow programmatically for open-search behavior', async () => {
    const db = makeDbStub();
    const openInBrowser = vi.fn();
    const printSearchResults = vi.fn();
    const printNumberedSearchResults = vi.fn();
    const printCardDetail = vi.fn();
    const promptForSelection = vi.fn();
    const writeErrorLine = vi.fn();

    const exitCode = await runSearchCommandWorkflow(
      {
        query: 'c:red',
        open: true,
        interactive: true,
        isInteractiveTerminal: true,
      },
      {
        openDatabase: () => db,
        search: () => ({ ok: true, data: [makeCard()] }),
        getCardByName: vi.fn(),
        printSearchResults,
        printNumberedSearchResults,
        printCardDetail,
        promptForSelection,
        openInBrowser,
        writeErrorLine,
      },
    );

    expect(exitCode).toBe(0);
    expect(openInBrowser).toHaveBeenCalledWith('https://scryfall.com/search?q=c%3Ared&unique=cards&as=grid');
    expect(writeErrorLine).toHaveBeenCalledWith('Opened Scryfall search in browser.');
    expect(printNumberedSearchResults).not.toHaveBeenCalled();
    expect(promptForSelection).not.toHaveBeenCalled();
    expect(printSearchResults).not.toHaveBeenCalled();
  });

  it('runs card workflow programmatically for multiple-match suggestions', () => {
    const db = makeDbStub();
    const printCardDetail = vi.fn();
    const printNumberedCardList = vi.fn();
    const writeLine = vi.fn();

    const exitCode = runCardCommandWorkflow(
      { name: 'Lightning' },
      {
        openDatabase: () => db,
        getCardByName: () => undefined,
        searchCardsByPrefix: () => [makeCard(), makeCard({ id: 'card-2', name: 'Lightning Helix' })],
        searchCardsBySubstring: vi.fn(),
        printCardDetail,
        printNumberedCardList,
        openInBrowser: vi.fn(),
        writeLine,
      },
    );

    expect(exitCode).toBe(0);
    expect(writeLine).toHaveBeenCalledWith('Multiple cards match "Lightning":');
    expect(printNumberedCardList).toHaveBeenCalledWith(expect.any(Array), 2);
    expect(printCardDetail).not.toHaveBeenCalled();
  });

  it('runs import workflow programmatically and emits progress messages', async () => {
    const db = makeDbStub();
    const writeLine = vi.fn();
    const writeErrorLine = vi.fn();

    const exitCode = await runImportCommandWorkflow(
      {},
      {
        openDatabase: () => db,
        runImport: async (_db, options) => {
          options.onProgress?.({ phase: 'manifest' });
          options.onProgress?.({ phase: 'download' });
          options.onProgress?.({ phase: 'parse' });
          options.onProgress?.({ phase: 'write' });
          options.onProgress?.({ phase: 'index' });
          return { ok: true, data: { cardCount: 42, duration: 1500 } };
        },
        writeLine,
        writeErrorLine,
      },
    );

    expect(exitCode).toBe(0);
    expect(writeLine).toHaveBeenNthCalledWith(1, 'Fetching card catalog...');
    expect(writeLine).toHaveBeenNthCalledWith(5, 'Rebuilding search index...');
    expect(writeLine).toHaveBeenLastCalledWith('Import complete: 42 cards imported in 1.5s');
    expect(writeErrorLine).not.toHaveBeenCalled();
  });

  it('runs sets workflow programmatically for successful result rendering', () => {
    const sets: SetRecord[] = [
      { code: 'stx', name: 'Strixhaven', released_at: '2021-04-23', set_type: 'expansion' },
    ];
    const db = makeDbStub({
      prepare: vi.fn(() => ({ get: () => ({ cnt: 1 }) })),
    });
    const printSets = vi.fn();

    const exitCode = runSetsCommandWorkflow(
      { term: 'strixhaven' },
      {
        openDatabase: () => db,
        searchSets: () => sets,
        printSets,
        writeLine: vi.fn(),
        writeErrorLine: vi.fn(),
      },
    );

    expect(exitCode).toBe(0);
    expect(printSets).toHaveBeenCalledWith(sets);
  });
});