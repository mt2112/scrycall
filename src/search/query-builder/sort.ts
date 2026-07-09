import type { SortOptions } from '../../models/query.js';

const RARITY_CASE_EXPR = `CASE cards.rarity WHEN 'common' THEN 0 WHEN 'uncommon' THEN 1 WHEN 'rare' THEN 2 WHEN 'mythic' THEN 3 ELSE 4 END`;

export function buildSortOrderBy(sort: SortOptions): string {
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