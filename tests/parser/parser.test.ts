import { describe, it, expect } from 'vitest';
import { parseQuery } from '../../src/parser/index.js';
import type { QueryNode } from '../../src/models/query.js';

describe('parser', () => {
  describe('simple queries', () => {
    it('should parse a single keyword', () => {
      const result = parseQuery('c:red');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter).toEqual({
        kind: 'comparison',
        field: 'color',
        operator: ':',
        value: 'red',
      });
    });

    it('should parse bare text as text search', () => {
      const result = parseQuery('lightning bolt');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter).toEqual({
        kind: 'textSearch',
        value: 'lightning bolt',
      });
    });

    it('should return default sort options', () => {
      const result = parseQuery('c:red');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort).toEqual({ field: 'name', direction: 'asc' });
    });
  });

  describe('AND (implicit)', () => {
    it('should parse two terms as AND', () => {
      const result = parseQuery('c:red t:creature');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('and');
      const node = result.data.filter as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(node.left).toEqual({ kind: 'comparison', field: 'color', operator: ':', value: 'red' });
      expect(node.right).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'creature' });
    });
  });

  describe('OR', () => {
    it('should parse OR between terms', () => {
      const result = parseQuery('t:elf or t:goblin');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('or');
      const node = result.data.filter as { kind: 'or'; left: QueryNode; right: QueryNode };
      expect(node.left).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'elf' });
      expect(node.right).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'goblin' });
    });
  });

  describe('precedence', () => {
    it('AND should bind tighter than OR', () => {
      const result = parseQuery('c:red t:creature or t:instant');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Should be: OR(AND(c:red, t:creature), t:instant)
      expect(result.data.filter.kind).toBe('or');
      const orNode = result.data.filter as { kind: 'or'; left: QueryNode; right: QueryNode };
      expect(orNode.left.kind).toBe('and');
      expect(orNode.right).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'instant' });
    });

    it('parentheses should override precedence', () => {
      const result = parseQuery('c:red (t:creature or t:instant)');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Should be: AND(c:red, OR(t:creature, t:instant))
      expect(result.data.filter.kind).toBe('and');
      const andNode = result.data.filter as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(andNode.left).toEqual({ kind: 'comparison', field: 'color', operator: ':', value: 'red' });
      expect(andNode.right.kind).toBe('or');
    });
  });

  describe('negation', () => {
    it('should parse negated term', () => {
      const result = parseQuery('-t:creature');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('not');
      const notNode = result.data.filter as { kind: 'not'; child: QueryNode };
      expect(notNode.child).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'creature' });
    });

    it('should parse negation combined with AND', () => {
      const result = parseQuery('c:red -t:creature');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('and');
      const andNode = result.data.filter as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(andNode.right.kind).toBe('not');
    });
  });

  describe('error cases', () => {
    it('should return error for empty query', () => {
      const result = parseQuery('');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('parse');
      expect(result.error.message).toContain('Empty query');
    });

    it('should return error for unmatched opening paren', () => {
      const result = parseQuery('(t:creature');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('parse');
      expect(result.error.message).toContain('parenthesis');
    });

    it('should return error for unmatched closing paren', () => {
      const result = parseQuery('t:creature)');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('parse');
    });
  });

  describe('complex queries', () => {
    it('should parse c:red t:creature pow>=4', () => {
      const result = parseQuery('c:red t:creature pow>=4');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // AND(AND(c:red, t:creature), pow>=4)
      expect(result.data.filter.kind).toBe('and');
    });

    it('should parse t:legendary (t:elf or t:goblin)', () => {
      const result = parseQuery('t:legendary (t:elf or t:goblin)');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('and');
      const andNode = result.data.filter as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(andNode.left).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'legendary' });
      expect(andNode.right.kind).toBe('or');
    });
  });

  describe('exact name prefix', () => {
    it('should parse !bolt as ExactNameNode', () => {
      const result = parseQuery('!bolt');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter).toEqual({ kind: 'exactName', value: 'bolt' });
    });

    it('should parse !"Lightning Bolt" as ExactNameNode', () => {
      const result = parseQuery('!"Lightning Bolt"');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter).toEqual({ kind: 'exactName', value: 'Lightning Bolt' });
    });

    it('should combine exact name with other terms', () => {
      const result = parseQuery('!"Lightning Bolt" s:m21');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('and');
    });
  });

  describe('and keyword', () => {
    it('should parse terms with and keyword as implicit AND', () => {
      const result = parseQuery('t:elf and t:cleric');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('and');
      const andNode = result.data.filter as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(andNode.left).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'elf' });
      expect(andNode.right).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'cleric' });
    });
  });

  describe('sort keywords', () => {
    it('should extract order: keyword as sort metadata', () => {
      const result = parseQuery('c:red order:cmc');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort).toEqual({ field: 'cmc', direction: 'asc' });
      expect(result.data.filter).toEqual({ kind: 'comparison', field: 'color', operator: ':', value: 'red' });
    });

    it('should extract direction: keyword', () => {
      const result = parseQuery('c:red direction:desc');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort).toEqual({ field: 'name', direction: 'desc' });
    });

    it('should extract both order: and direction:', () => {
      const result = parseQuery('c:red order:power direction:desc');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort).toEqual({ field: 'power', direction: 'desc' });
    });

    it('should use last order: when multiple present', () => {
      const result = parseQuery('c:red order:name order:cmc');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort.field).toBe('cmc');
    });

    it('should use last direction: when multiple present', () => {
      const result = parseQuery('c:red direction:asc direction:desc');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort.direction).toBe('desc');
    });

    it('should resolve sort field aliases', () => {
      const result = parseQuery('c:red order:pow');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort.field).toBe('power');
    });

    it('should resolve mv alias to cmc', () => {
      const result = parseQuery('c:red order:mv');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sort.field).toBe('cmc');
    });

    it('should return error for unknown sort field', () => {
      const result = parseQuery('c:red order:invalid');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('Unknown sort field');
    });

    it('should return error for invalid direction', () => {
      const result = parseQuery('c:red direction:sideways');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('Invalid sort direction');
    });

    it('should not include sort keywords in filter AST', () => {
      const result = parseQuery('c:red order:cmc t:creature direction:desc');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.filter.kind).toBe('and');
      expect(result.data.sort).toEqual({ field: 'cmc', direction: 'desc' });
    });
  });
});
