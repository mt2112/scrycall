import type { Operator } from '../../models/query.js';
import { QueryBuildContext, type SqlQuery } from './shared.js';

const RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3,
};

const COLOR_ALIASES: Record<string, string[]> = {
  white: ['W'],
  blue: ['U'],
  black: ['B'],
  red: ['R'],
  green: ['G'],
  azorius: ['W', 'U'],
  dimir: ['U', 'B'],
  rakdos: ['B', 'R'],
  gruul: ['R', 'G'],
  selesnya: ['G', 'W'],
  orzhov: ['W', 'B'],
  izzet: ['U', 'R'],
  golgari: ['B', 'G'],
  boros: ['R', 'W'],
  simic: ['G', 'U'],
  esper: ['W', 'U', 'B'],
  grixis: ['U', 'B', 'R'],
  jund: ['B', 'R', 'G'],
  naya: ['R', 'G', 'W'],
  bant: ['G', 'W', 'U'],
  abzan: ['W', 'B', 'G'],
  jeskai: ['U', 'R', 'W'],
  sultai: ['B', 'G', 'U'],
  mardu: ['R', 'W', 'B'],
  temur: ['U', 'R', 'G'],
  silverquill: ['W', 'B'],
  prismari: ['U', 'R'],
  witherbloom: ['B', 'G'],
  lorehold: ['R', 'W'],
  quandrix: ['G', 'U'],
  chaos: ['U', 'B', 'R', 'G'],
  aggression: ['W', 'B', 'R', 'G'],
  altruism: ['W', 'U', 'R', 'G'],
  growth: ['W', 'U', 'B', 'G'],
  artifice: ['W', 'U', 'B', 'R'],
  colorless: [],
  c: [],
};

const FIELD_REFERENCES: Record<string, { sql: string; nullCheck: string }> = {
  pow: { sql: 'CAST(cards.power AS REAL)', nullCheck: ' AND cards.power IS NOT NULL AND cards.power != \'*\'' },
  power: { sql: 'CAST(cards.power AS REAL)', nullCheck: ' AND cards.power IS NOT NULL AND cards.power != \'*\'' },
  tou: { sql: 'CAST(cards.toughness AS REAL)', nullCheck: ' AND cards.toughness IS NOT NULL AND cards.toughness != \'*\'' },
  toughness: { sql: 'CAST(cards.toughness AS REAL)', nullCheck: ' AND cards.toughness IS NOT NULL AND cards.toughness != \'*\'' },
  loy: { sql: 'CAST(cards.loyalty AS REAL)', nullCheck: ' AND cards.loyalty IS NOT NULL AND cards.loyalty != \'*\'' },
  loyalty: { sql: 'CAST(cards.loyalty AS REAL)', nullCheck: ' AND cards.loyalty IS NOT NULL AND cards.loyalty != \'*\'' },
  cmc: { sql: 'cards.cmc', nullCheck: '' },
  mv: { sql: 'cards.cmc', nullCheck: '' },
};

function resolveFieldReference(value: string): { sql: string; nullCheck: string } | null {
  const lower = value.toLowerCase();
  return FIELD_REFERENCES[lower] ?? null;
}

function parseColors(value: string): string[] {
  const lower = value.toLowerCase();
  if (lower in COLOR_ALIASES) return COLOR_ALIASES[lower];

  const colors: string[] = [];
  for (const ch of value.toUpperCase()) {
    if ('WUBRG'.includes(ch)) {
      colors.push(ch);
    }
  }
  return colors;
}

function buildColorQuery(
  table: 'color' | 'identity',
  operator: Operator,
  value: string,
): SqlQuery {
  const lower = value.toLowerCase();
  const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';

  if (lower === 'multicolor' || (lower === 'm' && !(lower in COLOR_ALIASES))) {
    return {
      joins: [],
      where: `(SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id) > 1`,
      params: [],
    };
  }

  if (/^\d+$/.test(value)) {
    const count = parseInt(value, 10);
    const sqlOp = operator === ':' ? '=' : operator;
    return {
      joins: [],
      where: `(SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id) ${sqlOp} ?`,
      params: [count],
    };
  }

  const colors = parseColors(value);

  if (operator === ':' || operator === '>=' || operator === '>') {
    if (colors.length === 0) {
      if (operator === ':') {
        return {
          joins: [],
          where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id)`,
          params: [],
        };
      }
      return { joins: [], where: '1=1', params: [] };
    }

    const placeholders = colors.map(() => '?').join(', ');

    if (operator === '>') {
      return {
        joins: [],
        where: `cards.id IN (SELECT card_id FROM ${colorTable} WHERE color IN (${placeholders}) GROUP BY card_id HAVING COUNT(DISTINCT color) = ?) AND cards.id IN (SELECT card_id FROM ${colorTable} GROUP BY card_id HAVING COUNT(DISTINCT color) > ?)`,
        params: [...colors, colors.length, colors.length],
      };
    }

    return {
      joins: [],
      where: `cards.id IN (SELECT card_id FROM ${colorTable} WHERE color IN (${placeholders}) GROUP BY card_id HAVING COUNT(DISTINCT color) = ?)`,
      params: [...colors, colors.length],
    };
  }

  if (operator === '=') {
    if (colors.length === 0) {
      return {
        joins: [],
        where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id)`,
        params: [],
      };
    }

    const placeholders = colors.map(() => '?').join(', ');
    return {
      joins: [],
      where: `(SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id) = ? AND (SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id AND color IN (${placeholders})) = ?`,
      params: [colors.length, ...colors, colors.length],
    };
  }

  if (operator === '<=' || operator === '<') {
    if (colors.length === 0 && operator === '<=') {
      return {
        joins: [],
        where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id)`,
        params: [],
      };
    }

    const placeholders = colors.map(() => '?').join(', ');

    if (operator === '<') {
      return {
        joins: [],
        where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id AND color NOT IN (${placeholders})) AND (SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id) < ?`,
        params: [...colors, colors.length],
      };
    }

    return {
      joins: [],
      where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id AND color NOT IN (${placeholders}))`,
      params: [...colors],
    };
  }

  if (operator === '!=') {
    if (colors.length === 0) {
      return {
        joins: [],
        where: `EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id)`,
        params: [],
      };
    }

    const placeholders = colors.map(() => '?').join(', ');
    return {
      joins: [],
      where: `NOT ((SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id) = ? AND (SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id AND color IN (${placeholders})) = ?)`,
      params: [colors.length, ...colors, colors.length],
    };
  }

  return { joins: [], where: '1=1', params: [] };
}

function buildTypeQuery(_operator: Operator, value: string): SqlQuery {
  return {
    joins: [],
    where: `cards.type_line LIKE ? COLLATE NOCASE`,
    params: [`%${value}%`],
  };
}

function buildManaQuery(_operator: Operator, value: string): SqlQuery {
  return {
    joins: [],
    where: `cards.mana_cost LIKE ? COLLATE NOCASE`,
    params: [`%${value}%`],
  };
}

function buildOracleQuery(_operator: Operator, value: string): SqlQuery {
  const ftsValue = value.replace(/"/g, '""');
  return {
    joins: [],
    where: `cards.id IN (SELECT cards.id FROM cards JOIN cards_fts ON cards_fts.rowid = cards.rowid WHERE cards_fts MATCH ?)`,
    params: [`oracle_text: "${ftsValue}"`],
  };
}

export function buildNameQuery(value: string): SqlQuery {
  const ftsValue = value.replace(/"/g, '""');
  return {
    joins: [],
    where: `cards.id IN (SELECT cards.id FROM cards JOIN cards_fts ON cards_fts.rowid = cards.rowid WHERE cards_fts MATCH ?)`,
    params: [`name: "${ftsValue}"`],
  };
}

function buildManaValueQuery(operator: Operator, value: string): SqlQuery {
  const lower = value.toLowerCase();
  if (lower === 'even') {
    return {
      joins: [],
      where: `CAST(cards.cmc AS INTEGER) % 2 = 0`,
      params: [],
    };
  }
  if (lower === 'odd') {
    return {
      joins: [],
      where: `CAST(cards.cmc AS INTEGER) % 2 = 1`,
      params: [],
    };
  }

  const ref = resolveFieldReference(value);
  if (ref) {
    const sqlOp = operator === ':' ? '=' : operator;
    return {
      joins: [],
      where: `cards.cmc ${sqlOp} ${ref.sql}`,
      params: [],
    };
  }

  const num = parseFloat(value);
  const sqlOp = operator === ':' ? '=' : operator;
  return {
    joins: [],
    where: `cards.cmc ${sqlOp} ?`,
    params: [num],
  };
}

function buildPowerQuery(operator: Operator, value: string): SqlQuery {
  const ref = resolveFieldReference(value);
  if (ref) {
    const sqlOp = operator === ':' ? '=' : operator;
    return {
      joins: [],
      where: `CAST(cards.power AS REAL) ${sqlOp} ${ref.sql} AND cards.power IS NOT NULL AND cards.power != '*'${ref.nullCheck}`,
      params: [],
    };
  }

  const num = parseFloat(value);
  const sqlOp = operator === ':' ? '=' : operator;
  return {
    joins: [],
    where: `CAST(cards.power AS REAL) ${sqlOp} ? AND cards.power IS NOT NULL AND cards.power != '*'`,
    params: [num],
  };
}

function buildToughnessQuery(operator: Operator, value: string): SqlQuery {
  const ref = resolveFieldReference(value);
  if (ref) {
    const sqlOp = operator === ':' ? '=' : operator;
    return {
      joins: [],
      where: `CAST(cards.toughness AS REAL) ${sqlOp} ${ref.sql} AND cards.toughness IS NOT NULL AND cards.toughness != '*'${ref.nullCheck}`,
      params: [],
    };
  }

  const num = parseFloat(value);
  const sqlOp = operator === ':' ? '=' : operator;
  return {
    joins: [],
    where: `CAST(cards.toughness AS REAL) ${sqlOp} ? AND cards.toughness IS NOT NULL AND cards.toughness != '*'`,
    params: [num],
  };
}

function buildRarityQuery(operator: Operator, value: string): SqlQuery {
  const lower = value.toLowerCase();

  if (operator === ':' || operator === '=') {
    return { joins: [], where: `cards.rarity = ?`, params: [lower] };
  }

  if (operator === '!=') {
    return { joins: [], where: `cards.rarity != ?`, params: [lower] };
  }

  const targetOrder = RARITY_ORDER[lower];
  if (targetOrder === undefined) {
    return { joins: [], where: '1=0', params: [] };
  }

  const matchingRarities: string[] = [];
  for (const [rarity, order] of Object.entries(RARITY_ORDER)) {
    if (operator === '>' && order > targetOrder) matchingRarities.push(rarity);
    if (operator === '>=' && order >= targetOrder) matchingRarities.push(rarity);
    if (operator === '<' && order < targetOrder) matchingRarities.push(rarity);
    if (operator === '<=' && order <= targetOrder) matchingRarities.push(rarity);
  }

  if (matchingRarities.length === 0) {
    return { joins: [], where: '1=0', params: [] };
  }

  const placeholders = matchingRarities.map(() => '?').join(', ');
  return {
    joins: [],
    where: `cards.rarity IN (${placeholders})`,
    params: matchingRarities,
  };
}

function buildSetQuery(operator: Operator, value: string): SqlQuery {
  const lower = value.toLowerCase();
  if (operator === '!=') {
    return { joins: [], where: `cards.set_code != ? COLLATE NOCASE`, params: [lower] };
  }

  return { joins: [], where: `cards.set_code = ? COLLATE NOCASE`, params: [lower] };
}

function buildFormatQuery(context: QueryBuildContext, operator: Operator, value: string): SqlQuery {
  const alias = context.nextAlias('cl');
  const lower = value.toLowerCase();
  if (operator === '!=') {
    return {
      joins: [],
      where: `NOT EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = ? AND status IN ('legal', 'restricted'))`,
      params: [lower],
    };
  }

  return {
    joins: [`JOIN card_legalities ${alias} ON ${alias}.card_id = cards.id`],
    where: `${alias}.format = ? AND ${alias}.status IN ('legal', 'restricted')`,
    params: [lower],
  };
}

function buildKeywordQuery(context: QueryBuildContext, operator: Operator, value: string): SqlQuery {
  const alias = context.nextAlias('ck');
  const lower = value.toLowerCase();
  if (operator === '!=') {
    return {
      joins: [],
      where: `NOT EXISTS (SELECT 1 FROM card_keywords WHERE card_id = cards.id AND keyword = ? COLLATE NOCASE)`,
      params: [lower],
    };
  }

  return {
    joins: [`JOIN card_keywords ${alias} ON ${alias}.card_id = cards.id`],
    where: `${alias}.keyword = ? COLLATE NOCASE`,
    params: [lower],
  };
}

function buildLoyaltyQuery(operator: Operator, value: string): SqlQuery {
  const ref = resolveFieldReference(value);
  if (ref) {
    const sqlOp = operator === ':' ? '=' : operator;
    return {
      joins: [],
      where: `CAST(cards.loyalty AS REAL) ${sqlOp} ${ref.sql} AND cards.loyalty IS NOT NULL AND cards.loyalty != '*'${ref.nullCheck}`,
      params: [],
    };
  }

  const num = parseFloat(value);
  const sqlOp = operator === ':' ? '=' : operator;
  return {
    joins: [],
    where: `CAST(cards.loyalty AS REAL) ${sqlOp} ? AND cards.loyalty IS NOT NULL AND cards.loyalty != '*'`,
    params: [num],
  };
}

function buildBannedQuery(operator: Operator, value: string): SqlQuery {
  const lower = value.toLowerCase();
  if (operator === '!=') {
    return {
      joins: [],
      where: `NOT EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = ? AND status = 'banned')`,
      params: [lower],
    };
  }

  return {
    joins: [],
    where: `EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = ? AND status = 'banned')`,
    params: [lower],
  };
}

function buildRestrictedQuery(operator: Operator, value: string): SqlQuery {
  const lower = value.toLowerCase();
  if (operator === '!=') {
    return {
      joins: [],
      where: `NOT EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = ? AND status = 'restricted')`,
      params: [lower],
    };
  }

  return {
    joins: [],
    where: `EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = ? AND status = 'restricted')`,
    params: [lower],
  };
}

function buildPowTouQuery(operator: Operator, value: string): SqlQuery {
  const ref = resolveFieldReference(value);
  if (ref) {
    const sqlOp = operator === ':' ? '=' : operator;
    return {
      joins: [],
      where: `(CAST(cards.power AS REAL) + CAST(cards.toughness AS REAL)) ${sqlOp} ${ref.sql} AND cards.power IS NOT NULL AND cards.toughness IS NOT NULL AND cards.power != '*' AND cards.toughness != '*'${ref.nullCheck}`,
      params: [],
    };
  }

  const num = parseFloat(value);
  const sqlOp = operator === ':' ? '=' : operator;
  return {
    joins: [],
    where: `(CAST(cards.power AS REAL) + CAST(cards.toughness AS REAL)) ${sqlOp} ? AND cards.power IS NOT NULL AND cards.toughness IS NOT NULL AND cards.power != '*' AND cards.toughness != '*'`,
    params: [num],
  };
}

export function buildExactNameQuery(value: string): SqlQuery {
  return {
    joins: [],
    where: `cards.name = ? COLLATE NOCASE`,
    params: [value],
  };
}

export function buildFieldComparisonSql(
  context: QueryBuildContext,
  field: string,
  operator: Operator,
  value: string,
): SqlQuery | null {
  switch (field) {
    case 'color':
      return buildColorQuery('color', operator, value);
    case 'colorIdentity':
      return buildColorQuery('identity', operator, value);
    case 'commander':
      return buildColorQuery('identity', '<=', value);
    case 'type':
      return buildTypeQuery(operator, value);
    case 'oracle':
      return buildOracleQuery(operator, value);
    case 'mana':
      return buildManaQuery(operator, value);
    case 'manaValue':
      return buildManaValueQuery(operator, value);
    case 'power':
      return buildPowerQuery(operator, value);
    case 'toughness':
      return buildToughnessQuery(operator, value);
    case 'rarity':
      return buildRarityQuery(operator, value);
    case 'set':
      return buildSetQuery(operator, value);
    case 'format':
      return buildFormatQuery(context, operator, value);
    case 'keyword':
      return buildKeywordQuery(context, operator, value);
    case 'name':
      return buildNameQuery(value);
    case 'loyalty':
      return buildLoyaltyQuery(operator, value);
    case 'banned':
      return buildBannedQuery(operator, value);
    case 'restricted':
      return buildRestrictedQuery(operator, value);
    case 'powtou':
      return buildPowTouQuery(operator, value);
    default:
      return null;
  }
}