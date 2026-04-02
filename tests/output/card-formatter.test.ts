import { describe, it, expect } from 'vitest';
import { formatNumberedCardList } from '../../src/output/card-formatter.js';
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
    ...overrides,
  };
}

describe('formatNumberedCardList', () => {
  it('should format a numbered list of cards', () => {
    const cards = [
      makeCard({ name: 'Lightning Bolt', manaCost: '{R}', typeLine: 'Instant' }),
      makeCard({ name: 'Lightning Helix', manaCost: '{R}{W}', typeLine: 'Instant' }),
    ];
    const result = formatNumberedCardList(cards, 2);
    expect(result).toContain('1. Lightning Bolt {R} — Instant');
    expect(result).toContain('2. Lightning Helix {R}{W} — Instant');
    expect(result).not.toContain('more');
  });

  it('should show "N more" when results are capped', () => {
    const cards = [
      makeCard({ name: 'Lightning Bolt' }),
      makeCard({ name: 'Lightning Helix' }),
    ];
    const result = formatNumberedCardList(cards, 15);
    expect(result).toContain('...and 13 more.');
  });

  it('should handle cards without mana cost', () => {
    const cards = [makeCard({ name: 'Forest', manaCost: null, typeLine: 'Basic Land — Forest' })];
    const result = formatNumberedCardList(cards, 1);
    expect(result).toContain('1. Forest — Basic Land — Forest');
  });
});
