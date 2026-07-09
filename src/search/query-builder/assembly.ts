import type { SortOptions } from '../../models/query.js';
import { buildSortOrderBy } from './sort.js';
import type { SqlQuery } from './shared.js';

export function buildFullQuery(
  query: SqlQuery,
  sort: SortOptions,
): { sql: string; params: readonly unknown[]; orderBy: string } {
  const joinClause = query.joins.length > 0 ? ` ${query.joins.join(' ')}` : '';
  const sql = `WHERE ${query.where}`;
  const fullSql = joinClause ? `${joinClause} ${sql}` : sql;

  return {
    sql: fullSql,
    params: query.params,
    orderBy: buildSortOrderBy(sort),
  };
}