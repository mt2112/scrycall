import type { SqlQuery } from './shared.js';

export function buildAndSql(left: SqlQuery, right: SqlQuery): SqlQuery {
  return {
    joins: [...left.joins, ...right.joins],
    where: `(${left.where}) AND (${right.where})`,
    params: [...left.params, ...right.params],
  };
}

export function buildOrSql(left: SqlQuery, right: SqlQuery): SqlQuery {
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

export function buildNotSql(child: SqlQuery): SqlQuery {
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