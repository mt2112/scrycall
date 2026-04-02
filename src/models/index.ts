export type { Card, Color, Rarity, Legality, FormatLegality } from './card.js';
export type { ParseError, ImportError, DbError, AppError } from './errors.js';

export type ImportProgressEvent =
  | { phase: 'manifest' }
  | { phase: 'download' }
  | { phase: 'parse' }
  | { phase: 'write' }
  | { phase: 'index' };

export type ImportProgressCallback = (event: ImportProgressEvent) => void;

export type {
  SearchField,
  Operator,
  Token,
  KeywordToken,
  BareWordToken,
  OpenParenToken,
  CloseParenToken,
  OrToken,
  NegateToken,
  QueryNode,
  ComparisonNode,
  TextSearchNode,
  AndNode,
  OrNode,
  NotNode,
} from './query.js';
