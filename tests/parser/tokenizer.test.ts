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

    it('should tokenize commander:RG', () => {
      const tokens = tokenize('commander:RG');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'commander', operator: ':', value: 'RG' },
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

  describe('and keyword skip', () => {
    it('should skip and between terms', () => {
      const tokens = tokenize('t:elf and t:cleric');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'type', operator: ':', value: 'elf' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'cleric' },
      ]);
    });

    it('should skip AND (uppercase)', () => {
      const tokens = tokenize('c:red AND t:creature');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'color', operator: ':', value: 'red' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'creature' },
      ]);
    });

    it('should skip and in parenthesized group', () => {
      const tokens = tokenize('(t:elf and t:cleric)');
      expect(tokens).toEqual([
        { kind: 'openParen' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'elf' },
        { kind: 'keyword', field: 'type', operator: ':', value: 'cleric' },
        { kind: 'closeParen' },
      ]);
    });
  });

  describe('set aliases', () => {
    it('should tokenize e:war as set field', () => {
      const tokens = tokenize('e:war');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'set', operator: ':', value: 'war' },
      ]);
    });

    it('should tokenize edition:m21 as set field', () => {
      const tokens = tokenize('edition:m21');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'set', operator: ':', value: 'm21' },
      ]);
    });
  });

  describe('name keyword', () => {
    it('should tokenize name:bolt', () => {
      const tokens = tokenize('name:bolt');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'name', operator: ':', value: 'bolt' },
      ]);
    });

    it('should tokenize name:"Lightning Bolt"', () => {
      const tokens = tokenize('name:"Lightning Bolt"');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'name', operator: ':', value: 'Lightning Bolt' },
      ]);
    });
  });

  describe('banned and restricted keywords', () => {
    it('should tokenize banned:legacy', () => {
      const tokens = tokenize('banned:legacy');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'banned', operator: ':', value: 'legacy' },
      ]);
    });

    it('should tokenize restricted:vintage', () => {
      const tokens = tokenize('restricted:vintage');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'restricted', operator: ':', value: 'vintage' },
      ]);
    });
  });

  describe('loyalty bare keyword', () => {
    it('should tokenize loy=3', () => {
      const tokens = tokenize('loy=3');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'loyalty', operator: '=', value: '3' },
      ]);
    });

    it('should tokenize loyalty>=4', () => {
      const tokens = tokenize('loyalty>=4');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'loyalty', operator: '>=', value: '4' },
      ]);
    });
  });

  describe('powtou bare keyword', () => {
    it('should tokenize pt>=10', () => {
      const tokens = tokenize('pt>=10');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'powtou', operator: '>=', value: '10' },
      ]);
    });

    it('should tokenize powtou=4', () => {
      const tokens = tokenize('powtou=4');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'powtou', operator: '=', value: '4' },
      ]);
    });
  });

  describe('exact name prefix', () => {
    it('should tokenize !bolt as exact name', () => {
      const tokens = tokenize('!bolt');
      expect(tokens).toEqual([
        { kind: 'exactName', value: 'bolt' },
      ]);
    });

    it('should tokenize !"Lightning Bolt" as exact name', () => {
      const tokens = tokenize('!"Lightning Bolt"');
      expect(tokens).toEqual([
        { kind: 'exactName', value: 'Lightning Bolt' },
      ]);
    });

    it('should not confuse ! with != operator', () => {
      const tokens = tokenize('c!=red');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'color', operator: '!=', value: 'red' },
      ]);
    });
  });

  describe('is/not/has keywords', () => {
    it('should tokenize is:spell', () => {
      const tokens = tokenize('is:spell');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'is', operator: ':', value: 'spell' },
      ]);
    });

    it('should tokenize not:spell', () => {
      const tokens = tokenize('not:spell');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'not', operator: ':', value: 'spell' },
      ]);
    });

    it('should tokenize has:loyalty', () => {
      const tokens = tokenize('has:loyalty');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'has', operator: ':', value: 'loyalty' },
      ]);
    });

    it('should tokenize -not:spell with negation prefix', () => {
      const tokens = tokenize('-not:spell');
      expect(tokens).toEqual([
        { kind: 'negate' },
        { kind: 'keyword', field: 'not', operator: ':', value: 'spell' },
      ]);
    });

    it('should tokenize is: with quoted value', () => {
      const tokens = tokenize('is:"french vanilla"');
      expect(tokens).toEqual([
        { kind: 'keyword', field: 'is', operator: ':', value: 'french vanilla' },
      ]);
    });
  });
});
