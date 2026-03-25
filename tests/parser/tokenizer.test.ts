import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/parser/tokenizer.js';

describe('tokenizer', () => {
  describe('keyword tokens', () => {
    it('should tokenize c:red', () => {
      const tokens = tokenize('c:red');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'color', operator: ':', value: 'red' },
      ]);
    });

    it('should tokenize color:blue', () => {
      const tokens = tokenize('color:blue');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'color', operator: ':', value: 'blue' },
      ]);
    });

    it('should tokenize t:creature', () => {
      const tokens = tokenize('t:creature');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'type', operator: ':', value: 'creature' },
      ]);
    });

    it('should tokenize o:draw', () => {
      const tokens = tokenize('o:draw');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'oracle', operator: ':', value: 'draw' },
      ]);
    });

    it('should tokenize f:modern', () => {
      const tokens = tokenize('f:modern');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'format', operator: ':', value: 'modern' },
      ]);
    });

    it('should tokenize s:neo', () => {
      const tokens = tokenize('s:neo');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'set', operator: ':', value: 'neo' },
      ]);
    });

    it('should tokenize r:mythic', () => {
      const tokens = tokenize('r:mythic');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'rarity', operator: ':', value: 'mythic' },
      ]);
    });

    it('should tokenize kw:flying', () => {
      const tokens = tokenize('kw:flying');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'keyword', operator: ':', value: 'flying' },
      ]);
    });

    it('should tokenize id:temur', () => {
      const tokens = tokenize('id:temur');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'colorIdentity', operator: ':', value: 'temur' },
      ]);
    });

    it('should tokenize m:{W}{U}', () => {
      const tokens = tokenize('m:{W}{U}');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'mana', operator: ':', value: '{W}{U}' },
      ]);
    });
  });

  describe('numeric keywords with operators', () => {
    it('should tokenize mv>=3', () => {
      const tokens = tokenize('mv>=3');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'manaValue', operator: '>=', value: '3' },
      ]);
    });

    it('should tokenize pow>4', () => {
      const tokens = tokenize('pow>4');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'power', operator: '>', value: '4' },
      ]);
    });

    it('should tokenize tou<=2', () => {
      const tokens = tokenize('tou<=2');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'toughness', operator: '<=', value: '2' },
      ]);
    });

    it('should tokenize cmc=4', () => {
      const tokens = tokenize('cmc=4');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'manaValue', operator: '=', value: '4' },
      ]);
    });
  });

  describe('comparison operators', () => {
    it('should tokenize c>=rg', () => {
      const tokens = tokenize('c>=rg');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'color', operator: '>=', value: 'rg' },
      ]);
    });

    it('should tokenize r!=common', () => {
      const tokens = tokenize('r!=common');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'rarity', operator: '!=', value: 'common' },
      ]);
    });
  });

  describe('quoted strings', () => {
    it('should tokenize o:"draw a card"', () => {
      const tokens = tokenize('o:"draw a card"');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'oracle', operator: ':', value: 'draw a card' },
      ]);
    });
  });

  describe('negation', () => {
    it('should tokenize -t:creature', () => {
      const tokens = tokenize('-t:creature');
      expect(tokens).toEqual([
        { kind: 'negate' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'creature' },
      ]);
    });
  });

  describe('parentheses and OR', () => {
    it('should tokenize (t:elf or t:goblin)', () => {
      const tokens = tokenize('(t:elf or t:goblin)');
      expect(tokens).toEqual([
        { kind: 'openParen' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'elf' },
        { kind: 'or' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'goblin' },
        { kind: 'closeParen' },
      ]);
    });

    it('should tokenize OR (uppercase)', () => {
      const tokens = tokenize('t:elf OR t:goblin');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'type', operator: ':', value: 'elf' },
        { kind: 'or' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'goblin' },
      ]);
    });
  });

  describe('bare words', () => {
    it('should tokenize bare words as name search', () => {
      const tokens = tokenize('lightning bolt');
      expect(tokens).toEqual([
        { kind: 'bareWord', value: 'lightning' },
        { kind: 'bareWord', value: 'bolt' },
      ]);
    });
  });

  describe('complex queries', () => {
    it('should tokenize c:red t:creature pow>=4', () => {
      const tokens = tokenize('c:red t:creature pow>=4');
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ kind: 'keyword', field: 'color', operator: ':', value: 'red' });
      expect(tokens[1]).toEqual({ kind: 'keyword', field: 'type', operator: ':', value: 'creature' });
      expect(tokens[2]).toEqual({ kind: 'keyword', field: 'power', operator: '>=', value: '4' });
    });
  });
});
