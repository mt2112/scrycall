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
});
