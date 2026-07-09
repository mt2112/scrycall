import type { SqlQuery } from './shared.js';

const IS_CONDITIONS: Record<string, () => SqlQuery> = {
  spell: () => ({
    joins: [],
    where: `cards.type_line NOT LIKE '%Land%'`,
    params: [],
  }),
  permanent: () => ({
    joins: [],
    where: `(cards.type_line LIKE '%Creature%' OR cards.type_line LIKE '%Artifact%' OR cards.type_line LIKE '%Enchantment%' OR cards.type_line LIKE '%Planeswalker%' OR cards.type_line LIKE '%Land%' OR cards.type_line LIKE '%Battle%')`,
    params: [],
  }),
  historic: () => ({
    joins: [],
    where: `(cards.type_line LIKE '%Legendary%' OR cards.type_line LIKE '%Artifact%' OR cards.type_line LIKE '%Saga%')`,
    params: [],
  }),
  vanilla: () => ({
    joins: [],
    where: `cards.type_line LIKE '%Creature%' AND (cards.oracle_text IS NULL OR cards.oracle_text = '')`,
    params: [],
  }),
  modal: () => ({
    joins: [],
    where: `cards.oracle_text LIKE '%choose one%' OR cards.oracle_text LIKE '%choose two%' OR cards.oracle_text LIKE '%choose three%' OR cards.oracle_text LIKE '%choose four%' OR cards.oracle_text LIKE '%choose five%'`,
    params: [],
  }),
  bear: () => ({
    joins: [],
    where: `cards.type_line LIKE '%Creature%' AND cards.power = '2' AND cards.toughness = '2' AND cards.cmc = 2`,
    params: [],
  }),
  hybrid: () => ({
    joins: [],
    where: `cards.mana_cost LIKE '%{_/_}%' AND cards.mana_cost NOT LIKE '%{_/P}%'`,
    params: [],
  }),
  phyrexian: () => ({
    joins: [],
    where: `cards.mana_cost LIKE '%/P}%'`,
    params: [],
  }),
  party: () => ({
    joins: [],
    where: `cards.type_line LIKE '%Creature%' AND (cards.type_line LIKE '%Cleric%' OR cards.type_line LIKE '%Rogue%' OR cards.type_line LIKE '%Warrior%' OR cards.type_line LIKE '%Wizard%')`,
    params: [],
  }),
  outlaw: () => ({
    joins: [],
    where: `cards.type_line LIKE '%Creature%' AND (cards.type_line LIKE '%Assassin%' OR cards.type_line LIKE '%Mercenary%' OR cards.type_line LIKE '%Pirate%' OR cards.type_line LIKE '%Rogue%' OR cards.type_line LIKE '%Warlock%')`,
    params: [],
  }),
  split: () => ({
    joins: [],
    where: `cards.layout = 'split'`,
    params: [],
  }),
  flip: () => ({
    joins: [],
    where: `cards.layout = 'flip'`,
    params: [],
  }),
  transform: () => ({
    joins: [],
    where: `cards.layout = 'transform'`,
    params: [],
  }),
  dfc: () => ({
    joins: [],
    where: `cards.layout IN ('transform', 'modal_dfc')`,
    params: [],
  }),
  mdfc: () => ({
    joins: [],
    where: `cards.layout = 'modal_dfc'`,
    params: [],
  }),
  meld: () => ({
    joins: [],
    where: `cards.layout = 'meld'`,
    params: [],
  }),
  leveler: () => ({
    joins: [],
    where: `cards.layout = 'leveler'`,
    params: [],
  }),
  saga: () => ({
    joins: [],
    where: `cards.layout = 'saga'`,
    params: [],
  }),
  adventure: () => ({
    joins: [],
    where: `cards.layout = 'adventure'`,
    params: [],
  }),
};

const TAG_ALIASES: Record<string, string> = {
  cycleland: 'bikeland',
  bicycleland: 'bikeland',
  karoo: 'bounceland',
  snarl: 'shadowland',
  battleland: 'tangoland',
  trikeland: 'triome',
  tricycleland: 'triome',
  canland: 'canopyland',
  crowdland: 'bondland',
  bbdland: 'bondland',
  battlebondland: 'bondland',
  creatureland: 'manland',
  tdfc: 'transform',
};

const HAS_CONDITIONS: Record<string, () => SqlQuery> = {
  pt: () => ({
    joins: [],
    where: `cards.power IS NOT NULL AND cards.toughness IS NOT NULL`,
    params: [],
  }),
  loyalty: () => ({
    joins: [],
    where: `cards.loyalty IS NOT NULL`,
    params: [],
  }),
};

function buildIsQuery(value: string): SqlQuery {
  const lower = value.toLowerCase();
  const resolved = TAG_ALIASES[lower] ?? lower;
  const condition = IS_CONDITIONS[resolved];

  if (condition) {
    return condition();
  }

  return {
    joins: [],
    where: `EXISTS (SELECT 1 FROM card_tags WHERE card_id = cards.id AND tag = ?)`,
    params: [resolved],
  };
}

function buildNotConditionQuery(value: string): SqlQuery {
  const inner = buildIsQuery(value);
  return {
    joins: inner.joins,
    where: `NOT (${inner.where})`,
    params: inner.params,
  };
}

function buildHasQuery(value: string): SqlQuery {
  const lower = value.toLowerCase();
  const condition = HAS_CONDITIONS[lower];

  if (!condition) {
    return { joins: [], where: '1 = 0', params: [] };
  }

  return condition();
}

export function buildConditionQuery(kind: 'is' | 'not' | 'has', value: string): SqlQuery {
  switch (kind) {
    case 'is':
      return buildIsQuery(value);
    case 'not':
      return buildNotConditionQuery(value);
    case 'has':
      return buildHasQuery(value);
  }
}