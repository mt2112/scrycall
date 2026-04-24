import type { ParsedQuery } from '../models/query.js';
import type { ParseError } from '../models/errors.js';
import type { Result } from '../utils/result.js';
import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';

export function parseQuery(input: string): Result<ParsedQuery, ParseError> {
  const tokens = tokenize(input);
  return parse(tokens);
}

export { tokenize } from './tokenizer.js';
export { parse } from './parser.js';
