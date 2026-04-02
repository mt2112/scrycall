import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/db/migrations.js';
import { searchCards, getCardByName, searchCardsByPrefix, searchCardsBySubstring } from '../../src/db/queries.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function seedCard(
  db: Database.Database,
  overrides: Partial<{
    id: string;
    oracle_id: string;
    name: string;
    mana_cost: string;
    cmc: number;
    type_line: string;
    oracle_text: string;
    power: string;
    toughness: string;
    set_code: string;
    set_name: string;
    rarity: string;
    loyalty: string;
    colors: string[];
    color_identity: string[];
    keywords: string[];
    legalities: Record<string, string>;
  }> = {},
): void {
  const card = {
    id: overrides.id ?? 'test-id-1',
    oracle_id: overrides.oracle_id ?? 'oracle-1',
    name: overrides.name ?? 'Lightning Bolt',
    mana_cost: overrides.mana_cost ?? '{R}',
    cmc: overrides.cmc ?? 1,
    type_line: overrides.type_line ?? 'Instant',
    oracle_text: overrides.oracle_text ?? 'Lightning Bolt deals 3 damage to any target.',
    power: overrides.power ?? null,
    toughness: overrides.toughness ?? null,
    set_code: overrides.set_code ?? 'lea',
    set_name: overrides.set_name ?? 'Limited Edition Alpha',
    rarity: overrides.rarity ?? 'common',
    loyalty: overrides.loyalty ?? null,
  };

  db.prepare(
    `INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, power, toughness, set_code, set_name, rarity, loyalty)
     VALUES (@id, @oracle_id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @power, @toughness, @set_code, @set_name, @rarity, @loyalty)`,
  ).run(card);

  const colors = overrides.colors ?? ['R'];
  for (const color of colors) {
    db.prepare('INSERT INTO card_colors (card_id, color) VALUES (?, ?)').run(card.id, color);
  }

  const identity = overrides.color_identity ?? colors;
  for (const color of identity) {
    db.prepare('INSERT INTO card_color_identity (card_id, color) VALUES (?, ?)').run(
      card.id,
      color,
    );
  }

  const keywords = overrides.keywords ?? [];
  for (const kw of keywords) {
    db.prepare('INSERT INTO card_keywords (card_id, keyword) VALUES (?, ?)').run(card.id, kw);
  }

  const legalities = overrides.legalities ?? { modern: 'legal', legacy: 'legal' };
  for (const [format, status] of Object.entries(legalities)) {
    db.prepare('INSERT INTO card_legalities (card_id, format, status) VALUES (?, ?, ?)').run(
      card.id,
      format,
      status,
    );
  }
}

describe('queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('getCardByName', () => {
    it('should find a card by exact name (case-insensitive)', () => {
      seedCard(db);
      const card = getCardByName(db, 'lightning bolt');
      expect(card).toBeDefined();
      expect(card!.name).toBe('Lightning Bolt');
      expect(card!.colors).toEqual(['R']);
    });

    it('should return undefined for non-existent card', () => {
      const card = getCardByName(db, 'Nonexistent Card');
      expect(card).toBeUndefined();
    });

    it('should include legalities', () => {
      seedCard(db);
      const card = getCardByName(db, 'Lightning Bolt');
      expect(card!.legalities).toEqual({ modern: 'legal', legacy: 'legal' });
    });
  });

  describe('searchCards', () => {
    it('should return cards matching WHERE clause', () => {
      seedCard(db);
      seedCard(db, {
        id: 'test-id-2',
        name: 'Counterspell',
        mana_cost: '{U}{U}',
        cmc: 2,
        type_line: 'Instant',
        oracle_text: 'Counter target spell.',
        colors: ['U'],
        color_identity: ['U'],
      });

      const cards = searchCards(db, 'WHERE cards.rarity = ?', ['common']);
      expect(cards).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const cards = searchCards(db, 'WHERE cards.rarity = ?', ['mythic']);
      expect(cards).toHaveLength(0);
    });
  });

  describe('searchCardsByPrefix', () => {
    beforeEach(() => {
      seedCard(db, { id: 'bolt-1', name: 'Lightning Bolt' });
      seedCard(db, { id: 'helix-1', name: 'Lightning Helix', mana_cost: '{R}{W}', cmc: 2, colors: ['R', 'W'] });
      seedCard(db, { id: 'strike-1', name: 'Lightning Strike', mana_cost: '{1}{R}', cmc: 2 });
      seedCard(db, { id: 'serra-1', name: 'Serra Angel', mana_cost: '{3}{W}{W}', cmc: 5, type_line: 'Creature — Angel', colors: ['W'] });
    });

    it('should find cards by prefix', () => {
      const cards = searchCardsByPrefix(db, 'Lightning');
      expect(cards).toHaveLength(3);
      expect(cards.map((c) => c.name)).toEqual(['Lightning Bolt', 'Lightning Helix', 'Lightning Strike']);
    });

    it('should return empty array when no cards match prefix', () => {
      const cards = searchCardsByPrefix(db, 'Zzzzz');
      expect(cards).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const cards = searchCardsByPrefix(db, 'lightning');
      expect(cards).toHaveLength(3);
    });

    it('should limit results to 10', () => {
      for (let i = 0; i < 12; i++) {
        seedCard(db, { id: `dragon-${i}`, name: `Dragon ${String(i).padStart(2, '0')}` });
      }
      const cards = searchCardsByPrefix(db, 'Dragon');
      expect(cards).toHaveLength(10);
    });
  });

  describe('searchCardsBySubstring', () => {
    beforeEach(() => {
      seedCard(db, { id: 'bolt-1', name: 'Lightning Bolt' });
      seedCard(db, { id: 'helix-1', name: 'Lightning Helix', mana_cost: '{R}{W}', cmc: 2, colors: ['R', 'W'] });
      seedCard(db, { id: 'serra-1', name: 'Serra Angel', mana_cost: '{3}{W}{W}', cmc: 5, type_line: 'Creature — Angel', colors: ['W'] });
    });

    it('should find cards containing substring', () => {
      const result = searchCardsBySubstring(db, 'Bolt');
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Lightning Bolt');
      expect(result.totalCount).toBe(1);
    });

    it('should return empty result when no cards match', () => {
      const result = searchCardsBySubstring(db, 'Zzzzz');
      expect(result.cards).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should be case-insensitive', () => {
      const result = searchCardsBySubstring(db, 'bolt');
      expect(result.cards).toHaveLength(1);
    });

    it('should return total count when results exceed limit', () => {
      for (let i = 0; i < 12; i++) {
        seedCard(db, { id: `angel-${i}`, name: `Angel of ${String(i).padStart(2, '0')}`, colors: ['W'] });
      }
      const result = searchCardsBySubstring(db, 'Angel');
      expect(result.cards).toHaveLength(10);
      expect(result.totalCount).toBe(13); // Serra Angel + 12 seeded
    });
  });
});
