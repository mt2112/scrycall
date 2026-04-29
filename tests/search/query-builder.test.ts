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

    it('should build SQL for commander query as color identity subset', () => {
      const node: QueryNode = { kind: 'comparison', field: 'commander', operator: ':', value: 'RG' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_color_identity');
      expect(sql).toContain('NOT IN');
      expect(params).toContain('R');
      expect(params).toContain('G');
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

  describe('strixhaven college aliases', () => {
    it('should handle silverquill color alias (WB)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'silverquill' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_colors');
      expect(params).toContain('W');
      expect(params).toContain('B');
    });

    it('should handle prismari color alias (UR)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'prismari' };
      const { sql, params } = buildQuery(node);
      expect(params).toContain('U');
      expect(params).toContain('R');
    });

    it('should handle witherbloom color alias (BG)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'witherbloom' };
      const { sql, params } = buildQuery(node);
      expect(params).toContain('B');
      expect(params).toContain('G');
    });

    it('should handle lorehold color alias (RW)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'lorehold' };
      const { sql, params } = buildQuery(node);
      expect(params).toContain('R');
      expect(params).toContain('W');
    });

    it('should handle quandrix color alias (GU)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: ':', value: 'quandrix' };
      const { sql, params } = buildQuery(node);
      expect(params).toContain('G');
      expect(params).toContain('U');
    });

    it('should handle college alias with color identity subset', () => {
      const node: QueryNode = { kind: 'comparison', field: 'colorIdentity', operator: '<=', value: 'quandrix' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_color_identity');
      expect(params).toContain('G');
      expect(params).toContain('U');
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

  describe('numeric color count', () => {
    it('should build SQL for c=2 (exactly 2 colors)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: '=', value: '2' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('card_colors');
      expect(sql).toContain('= ?');
      expect(params).toContain(2);
    });

    it('should build SQL for c>=3 (3 or more colors)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: '>=', value: '3' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('>= ?');
      expect(params).toContain(3);
    });

    it('should build SQL for c=0 (colorless by count)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'color', operator: '=', value: '0' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('= ?');
      expect(params).toContain(0);
    });

    it('should build SQL for id=2 (identity with 2 colors)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'colorIdentity', operator: '=', value: '2' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('card_color_identity');
      expect(sql).toContain('= ?');
      expect(params).toContain(2);
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

  describe('is: conditions', () => {
    it('should build SQL for is:spell', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'spell' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("type_line NOT LIKE '%Land%'");
    });

    it('should build SQL for is:permanent', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'permanent' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("type_line LIKE '%Creature%'");
      expect(sql).toContain("type_line LIKE '%Land%'");
      expect(sql).toContain("type_line LIKE '%Artifact%'");
      expect(sql).toContain('OR');
    });

    it('should build SQL for is:historic', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'historic' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("type_line LIKE '%Legendary%'");
      expect(sql).toContain("type_line LIKE '%Artifact%'");
      expect(sql).toContain("type_line LIKE '%Saga%'");
    });

    it('should build SQL for is:vanilla', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'vanilla' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("type_line LIKE '%Creature%'");
      expect(sql).toContain('oracle_text IS NULL');
    });

    it('should build SQL for is:modal', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'modal' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("oracle_text LIKE '%choose one%'");
    });

    it('should build SQL for is:bear', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'bear' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("type_line LIKE '%Creature%'");
      expect(sql).toContain("power = '2'");
      expect(sql).toContain("toughness = '2'");
      expect(sql).toContain('cmc = 2');
    });

    it('should build SQL for is:hybrid', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'hybrid' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('mana_cost LIKE');
      expect(sql).toContain('{_/_}');
    });

    it('should build SQL for is:phyrexian', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'phyrexian' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('mana_cost LIKE');
      expect(sql).toContain('/P}');
    });

    it('should build SQL for is:party', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'party' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("type_line LIKE '%Creature%'");
      expect(sql).toContain("type_line LIKE '%Cleric%'");
      expect(sql).toContain("type_line LIKE '%Rogue%'");
      expect(sql).toContain("type_line LIKE '%Warrior%'");
      expect(sql).toContain("type_line LIKE '%Wizard%'");
    });

    it('should build SQL for is:outlaw', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'outlaw' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("type_line LIKE '%Creature%'");
      expect(sql).toContain("type_line LIKE '%Assassin%'");
      expect(sql).toContain("type_line LIKE '%Pirate%'");
    });

    it('should fall through to card_tags for unknown is: condition', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'fetchland' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_tags');
      expect(params).toContain('fetchland');
    });
  });

  describe('not: conditions', () => {
    it('should negate is:spell for not:spell', () => {
      const node: QueryNode = { kind: 'comparison', field: 'not', operator: ':', value: 'spell' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('NOT');
      expect(sql).toContain("type_line NOT LIKE '%Land%'");
    });

    it('should negate card_tags fallthrough for unknown not: condition', () => {
      const node: QueryNode = { kind: 'comparison', field: 'not', operator: ':', value: 'fetchland' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('NOT');
      expect(sql).toContain('card_tags');
      expect(params).toContain('fetchland');
    });
  });

  describe('has: conditions', () => {
    it('should build SQL for has:pt', () => {
      const node: QueryNode = { kind: 'comparison', field: 'has', operator: ':', value: 'pt' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('power IS NOT NULL');
      expect(sql).toContain('toughness IS NOT NULL');
    });

    it('should build SQL for has:loyalty', () => {
      const node: QueryNode = { kind: 'comparison', field: 'has', operator: ':', value: 'loyalty' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('loyalty IS NOT NULL');
    });

    it('should return 1=0 for unknown has: condition', () => {
      const node: QueryNode = { kind: 'comparison', field: 'has', operator: ':', value: 'nonexistent' };
      const { sql } = buildQuery(node);
      expect(sql).toContain('1 = 0');
    });
  });

  describe('layout-based is: conditions', () => {
    it('should build SQL for is:split', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'split' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("layout = 'split'");
    });

    it('should build SQL for is:dfc (transform or modal_dfc)', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'dfc' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("layout IN ('transform', 'modal_dfc')");
    });

    it('should build SQL for is:mdfc', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'mdfc' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("layout = 'modal_dfc'");
    });

    it('should build SQL for is:transform', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'transform' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("layout = 'transform'");
    });

    it('should build SQL for is:saga', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'saga' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("layout = 'saga'");
    });

    it('should build SQL for is:adventure', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'adventure' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("layout = 'adventure'");
    });
  });

  describe('tag aliases', () => {
    it('should resolve cycleland to bikeland tag', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'cycleland' };
      const { sql, params } = buildQuery(node);
      expect(sql).toContain('card_tags');
      expect(params).toContain('bikeland');
    });

    it('should resolve battleland to tangoland tag', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'battleland' };
      const { sql, params } = buildQuery(node);
      expect(params).toContain('tangoland');
    });

    it('should resolve creatureland to manland tag', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'creatureland' };
      const { sql, params } = buildQuery(node);
      expect(params).toContain('manland');
    });

    it('should resolve tdfc alias to transform layout condition', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'tdfc' };
      const { sql } = buildQuery(node);
      expect(sql).toContain("layout = 'transform'");
    });

    it('should resolve snarl to shadowland tag', () => {
      const node: QueryNode = { kind: 'comparison', field: 'is', operator: ':', value: 'snarl' };
      const { sql, params } = buildQuery(node);
      expect(params).toContain('shadowland');
    });
  });
});
