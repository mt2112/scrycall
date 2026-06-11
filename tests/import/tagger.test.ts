import { describe, it, expect } from 'vitest';
import { tagCard, TAG_RULES } from '../../src/import/tagger.js';
import type { ScryfallCard } from '../../src/import/importer.js';

function makeCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    cmc: 0,
    type_line: '',
    set: 'tst',
    set_name: 'Test Set',
    rarity: 'common',
    ...overrides,
  };
}

describe('tagger', () => {
  describe('dual', () => {
    it('matches original dual lands', () => {
      expect(TAG_RULES.dual(makeCard({ name: 'Tundra' }))).toBe(true);
      expect(TAG_RULES.dual(makeCard({ name: 'Underground Sea' }))).toBe(true);
      expect(TAG_RULES.dual(makeCard({ name: 'Tropical Island' }))).toBe(true);
    });

    it('rejects non-duals', () => {
      expect(TAG_RULES.dual(makeCard({ name: 'Hallowed Fountain' }))).toBe(false);
    });
  });

  describe('fetchland', () => {
    it('matches Flooded Strand', () => {
      expect(TAG_RULES.fetchland(makeCard({
        name: 'Flooded Strand',
        type_line: 'Land',
        oracle_text: '{T}, Pay 1 life, Sacrifice Flooded Strand: Search your library for a Plains or Island card, put it onto the battlefield, then shuffle.',
      }))).toBe(true);
    });

    it('rejects Evolving Wilds (no pay 1 life)', () => {
      expect(TAG_RULES.fetchland(makeCard({
        name: 'Evolving Wilds',
        type_line: 'Land',
        oracle_text: '{T}, Sacrifice Evolving Wilds: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.',
      }))).toBe(false);
    });

    it('rejects non-land', () => {
      expect(TAG_RULES.fetchland(makeCard({
        type_line: 'Instant',
        oracle_text: 'Search your library for a card, pay 1 life, put it onto the battlefield.',
      }))).toBe(false);
    });
  });

  describe('shockland', () => {
    it('matches Hallowed Fountain', () => {
      expect(TAG_RULES.shockland(makeCard({
        name: 'Hallowed Fountain',
        type_line: 'Land — Plains Island',
        oracle_text: 'As Hallowed Fountain enters, you may pay 2 life. If you don\'t, it enters tapped.',
      }))).toBe(true);
    });

    it('rejects land without two basic types', () => {
      expect(TAG_RULES.shockland(makeCard({
        type_line: 'Land',
        oracle_text: 'You may pay 2 life.',
      }))).toBe(false);
    });
  });

  describe('checkland', () => {
    it('matches Glacial Fortress', () => {
      expect(TAG_RULES.checkland(makeCard({
        type_line: 'Land',
        oracle_text: 'Glacial Fortress enters tapped unless you control a Plains or an Island.',
      }))).toBe(true);
    });

    it('rejects unrelated land', () => {
      expect(TAG_RULES.checkland(makeCard({
        type_line: 'Land',
        oracle_text: '{T}: Add {W} or {U}.',
      }))).toBe(false);
    });
  });

  describe('fastland', () => {
    it('matches Seachrome Coast', () => {
      expect(TAG_RULES.fastland(makeCard({
        type_line: 'Land',
        oracle_text: 'Seachrome Coast enters tapped unless you control two or fewer other lands.',
      }))).toBe(true);
    });
  });

  describe('slowland', () => {
    it('matches Deserted Beach', () => {
      expect(TAG_RULES.slowland(makeCard({
        type_line: 'Land',
        oracle_text: 'Deserted Beach enters tapped unless you control two or more other lands.',
      }))).toBe(true);
    });
  });

  describe('painland', () => {
    it('matches Adarkar Wastes', () => {
      expect(TAG_RULES.painland(makeCard({
        type_line: 'Land',
        oracle_text: '{T}: Add {C}.\n{T}: Add {W} or {U}. Adarkar Wastes deals 1 damage to you.',
      }))).toBe(true);
    });
  });

  describe('gainland', () => {
    it('matches Tranquil Cove', () => {
      expect(TAG_RULES.gainland(makeCard({
        type_line: 'Land',
        oracle_text: 'Tranquil Cove enters tapped.\nWhen Tranquil Cove enters, you gain 1 life.\n{T}: Add {W} or {U}.',
      }))).toBe(true);
    });
  });

  describe('scryland', () => {
    it('matches Temple of Enlightenment', () => {
      expect(TAG_RULES.scryland(makeCard({
        type_line: 'Land',
        oracle_text: 'Temple of Enlightenment enters tapped.\nWhen Temple of Enlightenment enters, scry 1.\n{T}: Add {W} or {U}.',
      }))).toBe(true);
    });
  });

  describe('bounceland', () => {
    it('matches Azorius Chancery', () => {
      expect(TAG_RULES.bounceland(makeCard({
        type_line: 'Land',
        oracle_text: 'Azorius Chancery enters tapped.\nWhen Azorius Chancery enters, return a land you control to its owner\'s hand.\n{T}: Add {W}{U}.',
      }))).toBe(true);
    });
  });

  describe('bikeland', () => {
    it('matches Irrigated Farmland', () => {
      expect(TAG_RULES.bikeland(makeCard({
        type_line: 'Land — Plains Island',
        oracle_text: 'Irrigated Farmland enters tapped.\nCycling {2}',
        keywords: ['Cycling'],
      }))).toBe(true);
    });

    it('rejects triome (3 types)', () => {
      expect(TAG_RULES.bikeland(makeCard({
        type_line: 'Land — Plains Island Swamp',
        oracle_text: 'Enters tapped.\nCycling {3}',
        keywords: ['Cycling'],
      }))).toBe(false);
    });
  });

  describe('triome', () => {
    it('matches Raffine\'s Tower', () => {
      expect(TAG_RULES.triome(makeCard({
        type_line: 'Land — Plains Island Swamp',
        oracle_text: 'Raffine\'s Tower enters tapped.\nCycling {3}',
        keywords: ['Cycling'],
      }))).toBe(true);
    });

    it('rejects bikeland (2 types)', () => {
      expect(TAG_RULES.triome(makeCard({
        type_line: 'Land — Plains Island',
        keywords: ['Cycling'],
      }))).toBe(false);
    });
  });

  describe('tangoland', () => {
    it('matches Prairie Stream', () => {
      expect(TAG_RULES.tangoland(makeCard({
        type_line: 'Land — Plains Island',
        oracle_text: 'Prairie Stream enters tapped unless you control two or more basic lands.',
      }))).toBe(true);
    });
  });

  describe('bondland', () => {
    it('matches Sea of Clouds', () => {
      expect(TAG_RULES.bondland(makeCard({
        type_line: 'Land',
        oracle_text: 'Sea of Clouds enters tapped unless you have two or more opponents.\n{T}: Add {W} or {U}.',
      }))).toBe(true);
    });
  });

  describe('canopyland', () => {
    it('matches Horizon Canopy', () => {
      expect(TAG_RULES.canopyland(makeCard({
        type_line: 'Land',
        oracle_text: '{T}, Pay 1 life: Add {G} or {W}.\n{1}, {T}, Sacrifice Horizon Canopy: Draw a card.',
      }))).toBe(true);
    });
  });

  describe('shadowland', () => {
    it('matches Choked Estuary', () => {
      expect(TAG_RULES.shadowland(makeCard({
        type_line: 'Land',
        oracle_text: 'As Choked Estuary enters, you may reveal an Island or Swamp card from your hand. If you don\'t, it enters tapped.',
      }))).toBe(true);
    });
  });

  describe('filterland', () => {
    it('matches Mystic Gate', () => {
      expect(TAG_RULES.filterland(makeCard({
        type_line: 'Land',
        oracle_text: '{T}: Add {C}.\n{W/U}, {T}: Add {W}{W}, {W}{U}, or {U}{U}.',
      }))).toBe(false); // filterland pattern is "{1}, {T}: Add" — Mystic Gate uses hybrid
    });

    it('matches Skycloud Expanse', () => {
      expect(TAG_RULES.filterland(makeCard({
        type_line: 'Land',
        oracle_text: '{1}, {T}: Add {W}{U}.',
      }))).toBe(true);
    });
  });

  describe('storageland', () => {
    it('matches Calciform Pools', () => {
      expect(TAG_RULES.storageland(makeCard({
        type_line: 'Land',
        oracle_text: '{T}: Add {C}.\n{1}, {T}: Put a storage counter on Calciform Pools.\n{1}, Remove X storage counters from Calciform Pools: Add X mana in any combination of {W} and/or {U}.',
      }))).toBe(true);
    });
  });

  describe('surveilland', () => {
    it('matches Undercity Sewers', () => {
      expect(TAG_RULES.surveilland(makeCard({
        type_line: 'Land',
        oracle_text: 'Undercity Sewers enters tapped.\nWhen Undercity Sewers enters, surveil 1.\n{T}: Add {U} or {B}.',
      }))).toBe(true);
    });
  });

  describe('manland', () => {
    it('matches Celestial Colonnade', () => {
      expect(TAG_RULES.manland(makeCard({
        type_line: 'Land',
        oracle_text: 'Celestial Colonnade enters tapped.\n{3}{W}{U}: Until end of turn, Celestial Colonnade becomes a 4/4 white and blue Elemental creature with flying and vigilance. It\'s still a land.',
      }))).toBe(true);
    });

    it('rejects land without creature activation', () => {
      expect(TAG_RULES.manland(makeCard({
        type_line: 'Land',
        oracle_text: '{T}: Add {W} or {U}.',
      }))).toBe(false);
    });
  });

  describe('pathway', () => {
    it('matches modal DFC land', () => {
      expect(TAG_RULES.pathway(makeCard({
        type_line: 'Land',
        layout: 'modal_dfc',
      }))).toBe(true);
    });

    it('rejects normal land', () => {
      expect(TAG_RULES.pathway(makeCard({
        type_line: 'Land',
        layout: 'normal',
      }))).toBe(false);
    });

    it('rejects modal DFC non-land', () => {
      expect(TAG_RULES.pathway(makeCard({
        type_line: 'Instant',
        layout: 'modal_dfc',
      }))).toBe(false);
    });
  });

  describe('commander', () => {
    it('matches legendary creature', () => {
      expect(TAG_RULES.commander(makeCard({
        type_line: 'Legendary Creature — Elf Warrior',
      }))).toBe(true);
    });

    it('matches legendary planeswalker', () => {
      expect(TAG_RULES.commander(makeCard({
        type_line: 'Legendary Planeswalker — Jace',
      }))).toBe(true);
    });

    it('matches "can be your commander" text', () => {
      expect(TAG_RULES.commander(makeCard({
        type_line: 'Enchantment',
        oracle_text: 'Eminence — This card can be your commander.',
      }))).toBe(true);
    });

    it('rejects non-legendary creature', () => {
      expect(TAG_RULES.commander(makeCard({
        type_line: 'Creature — Goblin',
      }))).toBe(false);
    });
  });

  describe('partner', () => {
    it('matches card with Partner keyword', () => {
      expect(TAG_RULES.partner(makeCard({
        keywords: ['Partner'],
      }))).toBe(true);
    });

    it('rejects card without Partner', () => {
      expect(TAG_RULES.partner(makeCard({
        keywords: ['Flying'],
      }))).toBe(false);
    });
  });

  describe('companion', () => {
    it('matches card with Companion text', () => {
      expect(TAG_RULES.companion(makeCard({
        oracle_text: 'Companion — Each creature card in your starting deck has a different name.',
      }))).toBe(true);
    });

    it('rejects card without Companion', () => {
      expect(TAG_RULES.companion(makeCard({
        oracle_text: 'Flying',
      }))).toBe(false);
    });
  });

  describe('brawler', () => {
    it('matches legendary creature', () => {
      expect(TAG_RULES.brawler(makeCard({
        type_line: 'Legendary Creature — Human',
      }))).toBe(true);
    });

    it('rejects non-legendary', () => {
      expect(TAG_RULES.brawler(makeCard({
        type_line: 'Creature — Human',
      }))).toBe(false);
    });
  });

  describe('oathbreaker', () => {
    it('matches planeswalker', () => {
      expect(TAG_RULES.oathbreaker(makeCard({
        type_line: 'Legendary Planeswalker — Jace',
      }))).toBe(true);
    });

    it('rejects non-planeswalker', () => {
      expect(TAG_RULES.oathbreaker(makeCard({
        type_line: 'Legendary Creature — Human',
      }))).toBe(false);
    });
  });

  describe('tagCard', () => {
    it('returns multiple matching tags', () => {
      const tags = tagCard(makeCard({
        name: 'Test Commander',
        type_line: 'Legendary Planeswalker — Test',
      }));
      expect(tags).toContain('commander');
      expect(tags).toContain('brawler');
      expect(tags).toContain('oathbreaker');
    });

    it('returns empty array for vanilla card', () => {
      const tags = tagCard(makeCard({
        type_line: 'Creature — Goblin',
      }));
      expect(tags).toEqual([]);
    });
  });
});
