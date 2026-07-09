import type { QueryNode, Operator, ParsedQuery, SortField } from '../models/query.js';
import type Database from 'better-sqlite3';
import { buildFullQuery } from './query-builder/assembly.js';
import { buildAndSql, buildNotSql, buildOrSql } from './query-builder/boolean.js';
import { buildConditionQuery } from './query-builder/conditions.js';
import { buildExactNameQuery, buildFieldComparisonSql, buildNameQuery } from './query-builder/field-builders.js';
import { QueryBuildContext, type SqlQuery } from './query-builder/shared.js';

export type { SqlQuery } from './query-builder/shared.js';

function buildComparisonSql(
  context: QueryBuildContext,
  field: string,
  operator: Operator,
  value: string,
) {
  switch (field) {
    case 'is':
      return buildConditionQuery('is', value);
    case 'not':
      return buildConditionQuery('not', value);
    case 'has':
      return buildConditionQuery('has', value);
    default:
      return buildFieldComparisonSql(context, field, operator, value) ?? { joins: [], where: '1=0', params: [] };
  }
}

function buildNodeSql(context: QueryBuildContext, node: QueryNode): SqlQuery {
  switch (node.kind) {
    case 'comparison':
      return buildComparisonSql(context, node.field, node.operator, node.value);

    case 'textSearch':
      return buildNameQuery(node.value);

    case 'exactName':
      return buildExactNameQuery(node.value);

    case 'and': {
      const left: SqlQuery = buildNodeSql(context, node.left);
      const right: SqlQuery = buildNodeSql(context, node.right);
      return buildAndSql(left, right);
    }

    case 'or': {
      const left: SqlQuery = buildNodeSql(context, node.left);
      const right: SqlQuery = buildNodeSql(context, node.right);
      return buildOrSql(left, right);
    }

    case 'not': {
      const child: SqlQuery = buildNodeSql(context, node.child);
      return buildNotSql(child);
    }
  }
}

export function buildQuery(input: ParsedQuery | QueryNode, db?: Database.Database): { sql: string; params: readonly unknown[]; orderBy: string } {
  const ast = 'filter' in input ? input.filter : input;
  const sort = 'sort' in input ? input.sort : { field: 'name' as SortField, direction: 'asc' as const };

  const context = new QueryBuildContext();
  context.db = db ?? null;
  const result = buildNodeSql(context, ast);

  return buildFullQuery(result, sort);
}
