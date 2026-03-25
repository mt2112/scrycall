import type { QueryNode, Operator } from '../models/query.js';

export interface SqlQuery {
  readonly joins: readonly string[];
  readonly where: string;
  readonly params: readonly unknown[];
}

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
  colorless: [],
  c: [],
};

let joinCounter = 0;

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
  const colors = parseColors(value);
  const colorTable = table === 'color' ? 'card_colors' : 'card_color_identity';

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
  // Use FTS5 for oracle text search
  const ftsValue = value.replace(/"/g, '""');
  return {
    joins: [`JOIN cards_fts ON cards_fts.rowid = cards.rowid`],
    where: `cards_fts MATCH ?`,
    params: [`oracle_text: "${ftsValue}"`],
  };
}

function buildNameQuery(value: string): SqlQuery {
  const ftsValue = value.replace(/"/g, '""');
  return {
    joins: [`JOIN cards_fts ON cards_fts.rowid = cards.rowid`],
    where: `cards_fts MATCH ?`,
    params: [`name: "${ftsValue}"`],
  };
}

function buildManaValueQuery(operator: Operator, value: string): SqlQuery {
  const num = parseFloat(value);
  const sqlOp = operator === ':' ? '=' : operator;
  return {
    joins: [],
    where: `cards.cmc ${sqlOp} ?`,
    params: [num],
  };
}

function buildPowerQuery(operator: Operator, value: string): SqlQuery {
  const num = parseFloat(value);
  const sqlOp = operator === ':' ? '=' : operator;
  return {
    joins: [],
    where: `CAST(cards.power AS REAL) ${sqlOp} ? AND cards.power IS NOT NULL AND cards.power != '*'`,
    params: [num],
  };
}

function buildToughnessQuery(operator: Operator, value: string): SqlQuery {
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

export function buildQuery(ast: QueryNode): { sql: string; params: readonly unknown[] } {
  // Reset join counter for each query
  joinCounter = 0;

  const result = buildNodeSql(ast);
  const joinClause = result.joins.length > 0 ? ` ${result.joins.join(' ')}` : '';
  const sql = `WHERE ${result.where}`;
  const fullSql = joinClause ? `${joinClause} ${sql}` : sql;

  return { sql: fullSql, params: result.params };
}
