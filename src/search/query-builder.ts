import type { QueryNode, Operator, ParsedQuery, SortOptions, SortField } from '../models/query.js';

export interface SqlQuery {
  readonly joins: readonly string[];
  readonly where: string;
  readonly params: readonly unknown[];
  readonly orderBy?: string;
}

const RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3,
};

const RARITY_CASE_EXPR = `CASE cards.rarity WHEN 'common' THEN 0 WHEN 'uncommon' THEN 1 WHEN 'rare' THEN 2 WHEN 'mythic' THEN 3 ELSE 4 END`;

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

let joinCounter = 0;

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

function nextAlias(prefix: string): string {
  return `${prefix}${joinCounter++}`;
}

function parseColors(value: string): string[] {
  const lower = value.toLowerCase();
  if (lower in COLOR_ALIASES) return COLOR_ALIASES[lower];

  // Parse individual color characters: "rg" → ["R", "G"]
  const colors: string[] = [];
  for (const ch of value.toUpperCase()) {
    if ('WUBRG'.includes(ch)) {
      colors.push(ch);
    }
  }
  return colors;
}

function buildColorQuery(
  table: string,
  operator: Operator,
  value: string,
): SqlQuery {
  const lower = value.toLowerCase();
  const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';

  // Handle multicolor special value
  if (lower === 'multicolor' || (lower === 'm' && !(lower in COLOR_ALIASES))) {
    return {
      joins: [],
      where: `(SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id) > 1`,
      params: [],
    };
  }

  // Handle numeric color count (e.g., c=2, c>=3, c=0)
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
    // Superset: card has at least these colors
    if (colors.length === 0) {
      if (operator === ':') {
        // c:colorless means "has no colors"
        return {
          joins: [],
          where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id)`,
          params: [],
        };
      }
      // colorless for >= or > — all cards match (superset of empty)
      return { joins: [], where: '1=1', params: [] };
    }
    const placeholders = colors.map(() => '?').join(', ');

    if (operator === '>') {
      // Strict superset: has all these colors AND at least one more
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
    // Exact match
    if (colors.length === 0) {
      // Colorless: no entries in color table
      const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';
      return {
        joins: [],
        where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id)`,
        params: [],
      };
    }
    const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';
    const alias2 = nextAlias('cc');
    const placeholders = colors.map(() => '?').join(', ');
    return {
      joins: [],
      where: `(SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id) = ? AND (SELECT COUNT(*) FROM ${colorTable} WHERE card_id = cards.id AND color IN (${placeholders})) = ?`,
      params: [colors.length, ...colors, colors.length],
    };
  }

  if (operator === '<=' || operator === '<') {
    // Subset: card colors are all within the given set
    if (colors.length === 0 && operator === '<=') {
      // Subset of empty = colorless
      const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';
      return {
        joins: [],
        where: `NOT EXISTS (SELECT 1 FROM ${colorTable} WHERE card_id = cards.id)`,
        params: [],
      };
    }
    const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';
    const placeholders = colors.map(() => '?').join(', ');

    if (operator === '<') {
      // Strict subset: all colors in set AND fewer total colors
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
    const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';
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

function buildTypeQuery(operator: Operator, value: string): SqlQuery {
  // Type uses LIKE for substring matching
  return {
    joins: [],
    where: `cards.type_line LIKE ? COLLATE NOCASE`,
    params: [`%${value}%`],
  };
}

function buildManaQuery(operator: Operator, value: string): SqlQuery {
  // Mana cost uses LIKE for substring matching against mana_cost column
  return {
    joins: [],
    where: `cards.mana_cost LIKE ? COLLATE NOCASE`,
    params: [`%${value}%`],
  };
}

function buildOracleQuery(operator: Operator, value: string): SqlQuery {
  // Use FTS5 for oracle text search via subquery to avoid ambiguity with multiple FTS queries
  const ftsValue = value.replace(/"/g, '""');
  return {
    joins: [],
    where: `cards.id IN (SELECT cards.id FROM cards JOIN cards_fts ON cards_fts.rowid = cards.rowid WHERE cards_fts MATCH ?)`,
    params: [`oracle_text: "${ftsValue}"`],
  };
}

function buildNameQuery(value: string): SqlQuery {
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

  // Map rarity ordinals for comparison
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

function buildFormatQuery(operator: Operator, value: string): SqlQuery {
  const alias = nextAlias('cl');
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

function buildKeywordQuery(operator: Operator, value: string): SqlQuery {
  const alias = nextAlias('ck');
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

function buildExactNameQuery(value: string): SqlQuery {
  return {
    joins: [],
    where: `cards.name = ? COLLATE NOCASE`,
    params: [value],
  };
}

// --- is:/not:/has: condition framework ---

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
  const condition = IS_CONDITIONS[lower];
  if (!condition) {
    return { joins: [], where: '1 = 0', params: [] };
  }
  return condition();
}

function buildNotConditionQuery(value: string): SqlQuery {
  const inner = buildIsQuery(value);
  if (inner.where === '1 = 0') {
    // Unknown condition negated → match all
    return { joins: [], where: '1 = 1', params: [] };
  }
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

function buildComparisonSql(
  field: string,
  operator: Operator,
  value: string,
): SqlQuery {
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
      return buildFormatQuery(operator, value);
    case 'keyword':
      return buildKeywordQuery(operator, value);
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
    case 'is':
      return buildIsQuery(value);
    case 'not':
      return buildNotConditionQuery(value);
    case 'has':
      return buildHasQuery(value);
    default:
      return { joins: [], where: '1=0', params: [] };
  }
}

function buildNodeSql(node: QueryNode): SqlQuery {
  switch (node.kind) {
    case 'comparison':
      return buildComparisonSql(node.field, node.operator, node.value);

    case 'textSearch':
      return buildNameQuery(node.value);

    case 'exactName':
      return buildExactNameQuery(node.value);

    case 'and': {
      const left = buildNodeSql(node.left);
      const right = buildNodeSql(node.right);
      return {
        joins: [...left.joins, ...right.joins],
        where: `(${left.where}) AND (${right.where})`,
        params: [...left.params, ...right.params],
      };
    }

    case 'or': {
      const left = buildNodeSql(node.left);
      const right = buildNodeSql(node.right);
      // For OR, we need subqueries to keep joins isolated
      if (left.joins.length > 0 || right.joins.length > 0) {
        const leftSql = left.joins.length > 0
          ? `cards.id IN (SELECT cards.id FROM cards ${left.joins.join(' ')} WHERE ${left.where})`
          : left.where;
        const rightSql = right.joins.length > 0
          ? `cards.id IN (SELECT cards.id FROM cards ${right.joins.join(' ')} WHERE ${right.where})`
          : right.where;
        return {
          joins: [],
          where: `(${leftSql} OR ${rightSql})`,
          params: [...left.params, ...right.params],
        };
      }
      return {
        joins: [],
        where: `(${left.where} OR ${right.where})`,
        params: [...left.params, ...right.params],
      };
    }

    case 'not': {
      const child = buildNodeSql(node.child);
      if (child.joins.length > 0) {
        return {
          joins: [],
          where: `cards.id NOT IN (SELECT cards.id FROM cards ${child.joins.join(' ')} WHERE ${child.where})`,
          params: [...child.params],
        };
      }
      return {
        joins: [],
        where: `NOT (${child.where})`,
        params: [...child.params],
      };
    }
  }
}

function buildSortOrderBy(sort: SortOptions): string {
  const dir = sort.direction === 'desc' ? 'DESC' : 'ASC';
  const nullsLast = sort.direction === 'desc'
    ? 'CASE WHEN %EXPR% IS NULL THEN 1 ELSE 0 END, %EXPR% DESC'
    : 'CASE WHEN %EXPR% IS NULL THEN 1 ELSE 0 END, %EXPR% ASC';

  switch (sort.field) {
    case 'name':
      return `cards.name COLLATE NOCASE ${dir}`;
    case 'cmc':
      return `cards.cmc ${dir}`;
    case 'power': {
      const expr = `CAST(NULLIF(cards.power, '*') AS REAL)`;
      return nullsLast.replaceAll('%EXPR%', expr);
    }
    case 'toughness': {
      const expr = `CAST(NULLIF(cards.toughness, '*') AS REAL)`;
      return nullsLast.replaceAll('%EXPR%', expr);
    }
    case 'rarity':
      return `${RARITY_CASE_EXPR} ${dir}`;
    case 'color':
      return `(SELECT COUNT(*) FROM card_colors WHERE card_id = cards.id) ${dir}`;
    case 'set':
      return `cards.set_code COLLATE NOCASE ${dir}`;
  }
}

export function buildQuery(input: ParsedQuery | QueryNode): { sql: string; params: readonly unknown[]; orderBy: string } {
  // Support both ParsedQuery and raw QueryNode for backwards compatibility
  const ast = 'filter' in input ? input.filter : input;
  const sort = 'sort' in input ? input.sort : { field: 'name' as SortField, direction: 'asc' as const };

  // Reset join counter for each query
  joinCounter = 0;

  const result = buildNodeSql(ast);
  const joinClause = result.joins.length > 0 ? ` ${result.joins.join(' ')}` : '';
  const sql = `WHERE ${result.where}`;
  const fullSql = joinClause ? `${joinClause} ${sql}` : sql;

  return { sql: fullSql, params: result.params, orderBy: buildSortOrderBy(sort) };
}
