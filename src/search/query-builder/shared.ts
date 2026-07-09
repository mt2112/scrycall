export interface SqlQuery {
  readonly joins: readonly string[];
  readonly where: string;
  readonly params: readonly unknown[];
  readonly orderBy?: string;
}

export class QueryBuildContext {
  #joinCounter = 0;

  nextAlias(prefix: string): string {
    return `${prefix}${this.#joinCounter++}`;
  }
}