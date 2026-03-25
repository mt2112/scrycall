export type SearchField =
  | 'color'
  | 'colorIdentity'
  | 'type'
  | 'oracle'
  | 'mana'
  | 'manaValue'
  | 'power'
  | 'toughness'
  | 'rarity'
  | 'set'
  | 'format'
  | 'keyword'
  | 'name';

export type Operator = ':' | '=' | '!=' | '>' | '<' | '>=' | '<=';

// --- Token types ---

export type KeywordToken = {
  readonly kind: 'keyword';
  readonly field: SearchField;
  readonly operator: Operator;
  readonly value: string;
};

export type BareWordToken = {
  readonly kind: 'bareWord';
  readonly value: string;
};

export type OpenParenToken = {
  readonly kind: 'openParen';
};

export type CloseParenToken = {
  readonly kind: 'closeParen';
};

export type OrToken = {
  readonly kind: 'or';
};

export type NegateToken = {
  readonly kind: 'negate';
};

export type Token =
  | KeywordToken
  | BareWordToken
  | OpenParenToken
  | CloseParenToken
  | OrToken
  | NegateToken;

// --- AST node types ---

export type ComparisonNode = {
  readonly kind: 'comparison';
  readonly field: SearchField;
  readonly operator: Operator;
  readonly value: string;
};

export type TextSearchNode = {
  readonly kind: 'textSearch';
  readonly value: string;
};

export type AndNode = {
  readonly kind: 'and';
  readonly left: QueryNode;
  readonly right: QueryNode;
};

export type OrNode = {
  readonly kind: 'or';
  readonly left: QueryNode;
  readonly right: QueryNode;
};

export type NotNode = {
  readonly kind: 'not';
  readonly child: QueryNode;
};

export type QueryNode =
  | ComparisonNode
  | TextSearchNode
  | AndNode
  | OrNode
  | NotNode;
