import { describe, it, expect } from 'vitest';
import { buildQuery } from '../../src/search/query-builder.js';
import type { QueryNode } from '../../src/models/query.js';

describe('query-builder', () => {
  describe('comparison nodes', () => {
    it('should build SQL for mana value comparison', () => {
      const node: QueryNode = { kind: 'comparison', field: 'manaValue', operator: '>=', value: '3' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('cmc >= ?');
      expect(params).toContain(3);
    });

    it('should build SQL for type search', () => {
      const node: QueryNode = { kind: 'comparison', field: 'type', operator: ':', value: 'creature' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('type_line LIKE ?');
      expect(params).toContain('%creature%');
    });

    it('should build SQL for rarity exact match', () => {
      const node: QueryNode = { kind: 'comparison', field: 'rarity', operator: ':', value: 'mythic' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('rarity = ?');
      expect(params).toContain('mythic');
    });

    it('should build SQL for rarity ordinal comparison', () => {
      const node: QueryNode = { kind: 'comparison', field: 'rarity', operator: '>=', value: 'rare' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('rarity IN');
      expect(params).toContain('rare');
      expect(params).toContain('mythic');
    });

    it('should build SQL for set query', () => {
      const node: QueryNode = { kind: 'comparison', field: 'set', operator: ':', value: 'neo' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('set_code = ?');
      expect(params).toContain('neo');
    });

    it('should build SQL for power comparison', () => {
      const node: QueryNode = { kind: 'comparison', field: 'power', operator: '>=', value: '4' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('CAST(cards.power AS REAL)');
      expect(sql).toContain('>= ?');
      expect(params).toContain(4);
    });

    it('should build SQL for format legality', () => {
      const node: QueryNode = { kind: 'comparison', field: 'format', operator: ':', value: 'modern' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_legalities');
      expect(sql).toContain('format = ?');
      expect(params).toContain('modern');
    });

    it('should build SQL for keyword ability', () => {
      const node: QueryNode = { kind: 'comparison', field: 'keyword', operator: ':', value: 'flying' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_keywords');
      expect(sql).toContain('keyword = ?');
      expect(params).toContain('flying');
    });
  });

  describe('text search', () => {
    it('should build FTS5 query for text search', () => {
      const node: QueryNode = { kind: 'textSearch', value: 'lightning bolt' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('cards_fts');
      expect(sql).toContain('MATCH ?');
    });
  });

  describe('boolean logic', () => {
    it('should build AND query', () => {
      const node: QueryNode = {
        kind: 'and',
        left: { kind: 'comparison', field: 'type', operator: ':', value: 'creature' },
        right: { kind: 'comparison', field: 'rarity', operator: ':', value: 'rare' },
      };
      const { sql } = buildQuery(node);
      expect(sql).toContain('AND');
    });

    it('should build OR query', () => {
      const node: QueryNode = {
        kind: 'or',
        left: { kind: 'comparison', field: 'type', operator: ':', value: 'elf' },
        right: { kind: 'comparison', field: 'type', operator: ':', value: 'goblin' },
      };
      const { sql } = buildQuery(node);
      expect(sql).toContain('OR');
    });

    it('should build NOT query', () => {
      const node: QueryNode = {
        kind: 'not',
        child: { kind: 'comparison', field: 'type', operator: ':', value: 'creature' },
      };
      const { sql } = buildQuery(node);
      expect(sql).toContain('NOT');
    });
  });

  describe('loyalty queries', () => {
    it('should build SQL for loyalty exact match', () => {
      const node: QueryNode = { kind: 'comparison', field: 'loyalty', operator: '=', value: '3' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('CAST(cards.loyalty AS REAL)');
      expect(sql).toContain('= ?');
      expect(sql).toContain('loyalty IS NOT NULL');
      expect(params).toContain(3);
    });

    it('should build SQL for loyalty range', () => {
      const node: QueryNode = { kind: 'comparison', field: 'loyalty', operator: '>=', value: '5' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('>= ?');
      expect(params).toContain(5);
    });
  });

  describe('banned and restricted queries', () => {
    it('should build SQL for banned card lookup', () => {
      const node: QueryNode = { kind: 'comparison', field: 'banned', operator: ':', value: 'legacy' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_legalities');
      expect(sql).toContain("status = 'banned'");
      expect(params).toContain('legacy');
    });

    it('should build SQL for restricted card lookup', () => {
      const node: QueryNode = { kind: 'comparison', field: 'restricted', operator: ':', value: 'vintage' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_legalities');
      expect(sql).toContain("status = 'restricted'");
      expect(params).toContain('vintage');
    });

    it('should build SQL for negated banned', () => {
      const node: QueryNode = { kind: 'comparison', field: 'banned', operator: '!=', value: 'modern' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('NOT EXISTS');
      expect(sql).toContain("status = 'banned'");
      expect(params).toContain('modern');
    });
  });

  describe('powtou queries', () => {
    it('should build SQL for combined power+toughness', () => {
      const node: QueryNode = { kind: 'comparison', field: 'powtou', operator: '>=', value: '10' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('CAST(cards.power AS REAL)');
      expect(sql).toContain('CAST(cards.toughness AS REAL)');
      expect(sql).toContain('>= ?');
      expect(params).toContain(10);
    });

    it('should exclude non-numeric power/toughness', () => {
      const node: QueryNode = { kind: 'comparison', field: 'powtou', operator: '=', value: '4' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("power != '*'");
      expect(sql).toContain("toughness != '*'");
    });
  });

  describe('exact name queries', () => {
    it('should build SQL for exact name match', () => {
      const node: QueryNode = { kind: 'exactName', value: 'Lightning Bolt' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('cards.name = ?');
      expect(sql).toContain('COLLATE NOCASE');
      expect(params).toContain('Lightning Bolt');
    });
  });

  describe('four-color aliases', () => {
    it('should handle chaos color alias (UBRG)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'chaos' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_colors');
      expect(params).toContain('U');
      expect(params).toContain('B');
      expect(params).toContain('R');
      expect(params).toContain('G');
    });
  });

  describe('multicolor queries', () => {
    it('should build SQL for c:multicolor', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'multicolor' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('card_colors');
      expect(sql).toContain('> 1');
    });

    it('should build SQL for c:m (multicolor short form)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'm' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('> 1');
    });
  });

  describe('mv:even and mv:odd', () => {
    it('should build SQL for even mana values', () => {
      const node: QueryNode = { kind: 'comparison', field: 'manaValue', operator: ':', value: 'even' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('% 2 = 0');
    });

    it('should build SQL for odd mana values', () => {
      const node: QueryNode = { kind: 'comparison', field: 'manaValue', operator: ':', value: 'odd' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('% 2 = 1');
    });
  });

  describe('cross-field numeric comparison', () => {
    it('should build pow>tou as column-to-column comparison', () => {
      const node: QueryNode = { kind: 'comparison', field: 'power', operator: '>', value: 'tou' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('CAST(cards.power AS REAL)');
      expect(sql).toContain('CAST(cards.toughness AS REAL)');
      expect(sql).toContain('>');
      expect(params).toHaveLength(0);
    });

    it('should build tou=pow as column-to-column comparison', () => {
      const node: QueryNode = { kind: 'comparison', field: 'toughness', operator: '=', value: 'pow' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('CAST(cards.toughness AS REAL)');
      expect(sql).toContain('CAST(cards.power AS REAL)');
      expect(params).toHaveLength(0);
    });

    it('should build pow>loy as column-to-column comparison', () => {
      const node: QueryNode = { kind: 'comparison', field: 'power', operator: '>', value: 'loy' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('CAST(cards.power AS REAL)');
      expect(sql).toContain('CAST(cards.loyalty AS REAL)');
      expect(params).toHaveLength(0);
    });
  });
});
