import { describe, it, expect, vi, afterEach } from 'vitest';
import { printNumberedSearchResults } from '../../src/output/display.js';
import type { Card } from '../../src/models/card.js';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-id',
    oracleId: 'oracle-id',
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
    setName: 'Limited Edition Alpha',
    rarity: 'common',
    legalities: {},
    loyalty: null,
    scryfallUri: null,
    ...overrides,
  };
}

describe('printNumberedSearchResults', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints numbered card list with count summary', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cards = [
      makeCard({ name: 'Lightning Bolt', manaCost: '{R}', typeLine: 'Instant' }),
      makeCard({ name: 'Serra Angel', manaCost: '{3}{W}{W}', typeLine: 'Creature — Angel' }),
    ];
    printNumberedSearchResults(cards);

    const output = spy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('1. Lightning Bolt');
    expect(output).toContain('2. Serra Angel');
    expect(output).toContain('2 cards found.');
  });

  it('prints singular count for one card', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cards = [makeCard({ name: 'Lightning Bolt' })];
    printNumberedSearchResults(cards);

    const output = spy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('1 card found.');
  });
});
