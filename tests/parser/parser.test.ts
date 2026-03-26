import { describe, it, expect } from 'vitest';
import { parseQuery } from '../../src/parser/index.js';
import type { QueryNode } from '../../src/models/query.js';

describe('parser', () => {
  describe('simple queries', () => {
    it('should parse a single keyword', () => {
      const result = parseQuery('c:red');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual({
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
      expect(result.data).toEqual({
        kind: 'textSearch',
        value: 'lightning bolt',
      });
    });
  });

  describe('AND (implicit)', () => {
    it('should parse two terms as AND', () => {
      const result = parseQuery('c:red t:creature');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.kind).toBe('and');
      const node = result.data as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(node.left).toEqual({ kind: 'comparison', field: 'color', operator: ':', value: 'red' });
      expect(node.right).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'creature' });
    });
  });

  describe('OR', () => {
    it('should parse OR between terms', () => {
      const result = parseQuery('t:elf or t:goblin');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.kind).toBe('or');
      const node = result.data as { kind: 'or'; left: QueryNode; right: QueryNode };
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
      expect(result.data.kind).toBe('or');
      const orNode = result.data as { kind: 'or'; left: QueryNode; right: QueryNode };
      expect(orNode.left.kind).toBe('and');
      expect(orNode.right).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'instant' });
    });

    it('parentheses should override precedence', () => {
      const result = parseQuery('c:red (t:creature or t:instant)');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Should be: AND(c:red, OR(t:creature, t:instant))
      expect(result.data.kind).toBe('and');
      const andNode = result.data as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(andNode.left).toEqual({ kind: 'comparison', field: 'color', operator: ':', value: 'red' });
      expect(andNode.right.kind).toBe('or');
    });
  });

  describe('negation', () => {
    it('should parse negated term', () => {
      const result = parseQuery('-t:creature');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.kind).toBe('not');
      const notNode = result.data as { kind: 'not'; child: QueryNode };
      expect(notNode.child).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'creature' });
    });

    it('should parse negation combined with AND', () => {
      const result = parseQuery('c:red -t:creature');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.kind).toBe('and');
      const andNode = result.data as { kind: 'and'; left: QueryNode; right: QueryNode };
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
      expect(result.data.kind).toBe('and');
    });

    it('should parse t:legendary (t:elf or t:goblin)', () => {
      const result = parseQuery('t:legendary (t:elf or t:goblin)');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.kind).toBe('and');
      const andNode = result.data as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(andNode.left).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'legendary' });
      expect(andNode.right.kind).toBe('or');
    });
  });

  describe('exact name prefix', () => {
    it('should parse !bolt as ExactNameNode', () => {
      const result = parseQuery('!bolt');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual({ kind: 'exactName', value: 'bolt' });
    });

    it('should parse !"Lightning Bolt" as ExactNameNode', () => {
      const result = parseQuery('!"Lightning Bolt"');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual({ kind: 'exactName', value: 'Lightning Bolt' });
    });

    it('should combine exact name with other terms', () => {
      const result = parseQuery('!"Lightning Bolt" s:m21');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.kind).toBe('and');
    });
  });

  describe('and keyword', () => {
    it('should parse terms with and keyword as implicit AND', () => {
      const result = parseQuery('t:elf and t:cleric');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.kind).toBe('and');
      const andNode = result.data as { kind: 'and'; left: QueryNode; right: QueryNode };
      expect(andNode.left).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'elf' });
      expect(andNode.right).toEqual({ kind: 'comparison', field: 'type', operator: ':', value: 'cleric' });
    });
  });
});
