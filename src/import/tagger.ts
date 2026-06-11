import type { ScryfallCard } from './importer.js';

const BASIC_LAND_TYPES = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];

function isLand(card: ScryfallCard): boolean {
  return card.type_line.includes('Land');
}

function oracleIncludes(card: ScryfallCard, text: string): boolean {
  return card.oracle_text?.toLowerCase().includes(text.toLowerCase()) ?? false;
}

function countBasicLandTypesInTypeLine(card: ScryfallCard): number {
  return BASIC_LAND_TYPES.filter((t) => card.type_line.includes(t)).length;
}

const DUAL_LAND_NAMES = new Set([
  'Tundra',
  'Underground Sea',
  'Badlands',
  'Taiga',
  'Savannah',
  'Scrubland',
  'Volcanic Island',
  'Bayou',
  'Plateau',
  'Tropical Island',
]);

const TAG_RULES: Record<string, (card: ScryfallCard) => boolean> = {
  // --- Land nicknames ---

  dual: (card) => DUAL_LAND_NAMES.has(card.name),

  fetchland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'search your library for') &&
    oracleIncludes(card, 'pay 1 life') &&
    oracleIncludes(card, 'put it onto the battlefield'),

  shockland: (card) =>
    isLand(card) &&
    countBasicLandTypesInTypeLine(card) === 2 &&
    oracleIncludes(card, 'pay 2 life'),

  checkland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'unless you control a'),

  fastland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'two or fewer other lands'),

  slowland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'two or more other lands'),

  painland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'deals 1 damage to you'),

  gainland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'enters tapped') &&
    oracleIncludes(card, 'gain 1 life'),

  scryland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'enters tapped') &&
    oracleIncludes(card, 'scry 1'),

  bounceland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'return a land') &&
    oracleIncludes(card, 'enters tapped'),

  bikeland: (card) =>
    isLand(card) &&
    countBasicLandTypesInTypeLine(card) === 2 &&
    (card.keywords?.includes('Cycling') ?? false),

  triome: (card) =>
    isLand(card) &&
    countBasicLandTypesInTypeLine(card) === 3 &&
    (card.keywords?.includes('Cycling') ?? false),

  tangoland: (card) =>
    isLand(card) &&
    countBasicLandTypesInTypeLine(card) === 2 &&
    oracleIncludes(card, 'two or more basic lands'),

  bondland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'two or more opponents'),

  canopyland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'pay 1 life') &&
    oracleIncludes(card, 'sacrifice') &&
    oracleIncludes(card, 'draw a card'),

  shadowland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'you may reveal') &&
    oracleIncludes(card, 'enters tapped'),

  filterland: (card) =>
    isLand(card) &&
    oracleIncludes(card, '{1}, {t}: add'),

  storageland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'storage counter'),

  surveilland: (card) =>
    isLand(card) &&
    oracleIncludes(card, 'enters tapped') &&
    oracleIncludes(card, 'surveil 1'),

  manland: (card) =>
    isLand(card) &&
    /becomes? a[\s\S]*creature/i.test(card.oracle_text ?? ''),

  pathway: (card) =>
    card.layout === 'modal_dfc' &&
    isLand(card),

  // --- Commander/format ---

  commander: (card) =>
    ((card.type_line.includes('Legendary') &&
      (card.type_line.includes('Creature') || card.type_line.includes('Planeswalker'))) ||
      oracleIncludes(card, 'can be your commander')),

  partner: (card) =>
    card.keywords?.includes('Partner') ?? false,

  companion: (card) =>
    oracleIncludes(card, 'companion —'),

  brawler: (card) =>
    card.type_line.includes('Legendary') &&
    (card.type_line.includes('Creature') || card.type_line.includes('Planeswalker')),

  oathbreaker: (card) =>
    card.type_line.includes('Planeswalker'),
};

export function tagCard(card: ScryfallCard): string[] {
  const tags: string[] = [];
  for (const [tag, rule] of Object.entries(TAG_RULES)) {
    if (rule(card)) {
      tags.push(tag);
    }
  }
  return tags;
}

export { TAG_RULES };
