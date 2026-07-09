import type Database from 'better-sqlite3';

export interface SqlQuery {
  readonly joins: readonly string[];
  readonly where: string;
  readonly params: readonly unknown[];
  readonly orderBy?: string;
}

export class QueryBuildContext {
  #joinCounter = 0;
  db: Database.Database | null = null;

  nextAlias(prefix: string): string {
    return `${prefix}${this.#joinCounter++}`;
  }
}