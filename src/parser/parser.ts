import type { Token, QueryNode } from '../models/query.js';
import type { ParseError } from '../models/errors.js';
import type { Result } from '../utils/result.js';
import { ok, err } from '../utils/result.js';

/**
 * Recursive descent parser.
 * Grammar:
 *   query     = orExpr
 *   orExpr    = andExpr ('or' andExpr)*
 *   andExpr   = unaryExpr (unaryExpr)*      -- implicit AND
 *   unaryExpr = '-' unaryExpr | '(' orExpr ')' | atom
 *   atom      = keyword | bareWord+
 */
export function parse(tokens: readonly Token[]): Result<QueryNode, ParseError> {
  if (tokens.length === 0) {
    return err({ kind: 'parse', message: 'Empty query', position: 0 });
  }

  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function advance(): Token {
    return tokens[pos++];
  }

  function parseOrExpr(): Result<QueryNode, ParseError> {
    const leftResult = parseAndExpr();
    if (!leftResult.ok) return leftResult;
    let left = leftResult.data;

    while (peek()?.kind === 'or') {
      advance(); // consume 'or'
      const rightResult = parseAndExpr();
      if (!rightResult.ok) return rightResult;
      left = { kind: 'or', left, right: rightResult.data };
    }

    return ok(left);
  }

  function parseAndExpr(): Result<QueryNode, ParseError> {
    const leftResult = parseUnary();
    if (!leftResult.ok) return leftResult;
    let left = leftResult.data;

    // Implicit AND: keep parsing while next token is not 'or', ')', or end
    while (peek() && peek()!.kind !== 'or' && peek()!.kind !== 'closeParen') {
      const rightResult = parseUnary();
      if (!rightResult.ok) return rightResult;
      left = { kind: 'and', left, right: rightResult.data };
    }

    return ok(left);
  }

  function parseUnary(): Result<QueryNode, ParseError> {
    const token = peek();
    if (!token) {
      return err({ kind: 'parse', message: 'Unexpected end of query', position: pos });
    }

    if (token.kind === 'negate') {
      advance();
      const childResult = parseUnary();
      if (!childResult.ok) return childResult;
      return ok({ kind: 'not', child: childResult.data });
    }

    if (token.kind === 'openParen') {
      advance(); // consume '('
      const innerResult = parseOrExpr();
      if (!innerResult.ok) return innerResult;

      const closeParen = peek();
      if (!closeParen || closeParen.kind !== 'closeParen') {
        return err({ kind: 'parse', message: 'Unmatched opening parenthesis', position: pos });
      }
      advance(); // consume ')'
      return innerResult;
    }

    return parseAtom();
  }

  function parseAtom(): Result<QueryNode, ParseError> {
    const token = peek();
    if (!token) {
      return err({ kind: 'parse', message: 'Unexpected end of query', position: pos });
    }

    if (token.kind === 'keyword') {
      advance();
      return ok({
        kind: 'comparison',
        field: token.field,
        operator: token.operator,
        value: token.value,
      });
    }

    if (token.kind === 'exactName') {
      advance();
      return ok({ kind: 'exactName', value: token.value });
    }

    if (token.kind === 'bareWord') {
      // Collect consecutive bare words into a single text search
      const words: string[] = [];
      while (peek()?.kind === 'bareWord') {
        words.push((advance() as { kind: 'bareWord'; value: string }).value);
      }
      return ok({ kind: 'textSearch', value: words.join(' ') });
    }

    if (token.kind === 'closeParen') {
      return err({ kind: 'parse', message: 'Unexpected closing parenthesis', position: pos });
    }

    return err({
      kind: 'parse',
      message: `Unexpected token: ${token.kind}`,
      position: pos,
    });
  }

  const result = parseOrExpr();
  if (!result.ok) return result;

  if (pos < tokens.length) {
    const remaining = peek();
    if (remaining?.kind === 'closeParen') {
      return err({ kind: 'parse', message: 'Unmatched closing parenthesis', position: pos });
    }
  }

  return result;
}
