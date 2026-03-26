## ADDED Requirements

### Requirement: Tokenizer recognizes all keyword prefixes
The tokenizer SHALL recognize the following keyword prefixes: `c:`, `color:`, `id:`, `identity:`, `t:`, `type:`, `o:`, `oracle:`, `m:`, `mana:`, `r:`, `rarity:`, `s:`, `set:`, `f:`, `format:`, `kw:`, `keyword:`. It SHALL also recognize bare keyword names `mv`, `manavalue`, `pow`, `power`, `tou`, `toughness` followed by an operator.

#### Scenario: Colon-separated keyword
- **WHEN** the input is `c:red`
- **THEN** the tokenizer produces a keyword token with field `color` and value `red`

#### Scenario: Numeric keyword with operator
- **WHEN** the input is `mv>=3`
- **THEN** the tokenizer produces a keyword token with field `manaValue`, operator `>=`, and value `3`

#### Scenario: Alias keyword
- **WHEN** the input is `pow>4`
- **THEN** the tokenizer produces a keyword token with field `power`, operator `>`, and value `4`

### Requirement: Tokenizer handles operators
The tokenizer SHALL recognize operators: `:`, `=`, `!=`, `>`, `<`, `>=`, `<=`.

#### Scenario: Greater-than-or-equal operator
- **WHEN** the input contains `>=`
- **THEN** it is tokenized as a single operator token, not `>` and `=` separately

### Requirement: Tokenizer handles quoted strings
The tokenizer SHALL recognize double-quoted strings as single value tokens, preserving the content between quotes (excluding the quotes themselves).

#### Scenario: Quoted phrase in oracle text search
- **WHEN** the input is `o:"draw a card"`
- **THEN** the value token contains `draw a card` (without quotes)

### Requirement: Tokenizer handles negation prefix
The tokenizer SHALL recognize `-` immediately before a keyword or parenthesis as a negation operator.

#### Scenario: Negated keyword
- **WHEN** the input is `-t:creature`
- **THEN** a negate token precedes the keyword token

### Requirement: Tokenizer handles parentheses and OR
The tokenizer SHALL recognize `(`, `)` as grouping tokens and `or`/`OR` as a boolean OR operator token.

#### Scenario: Parenthesized OR group
- **WHEN** the input is `(t:elf or t:goblin)`
- **THEN** tokens are: open-paren, keyword, or, keyword, close-paren

### Requirement: Tokenizer handles bare words as name search
The tokenizer SHALL treat unrecognized words (not keywords, not operators) as bare word tokens representing name search terms.

#### Scenario: Bare words
- **WHEN** the input is `lightning bolt`
- **THEN** two bare-word tokens are produced: `lightning` and `bolt`

### Requirement: Parser produces correct AST for implicit AND
The parser SHALL treat adjacent terms as implicit AND with higher precedence than OR.

#### Scenario: Two terms produce AND node
- **WHEN** the input is `c:red t:creature`
- **THEN** the AST is an `AndNode` with two `ComparisonNode` children

### Requirement: Parser produces correct AST for OR
The parser SHALL produce an `OrNode` when terms are separated by `or`/`OR`.

#### Scenario: OR between two terms
- **WHEN** the input is `t:elf or t:goblin`
- **THEN** the AST is an `OrNode` with two `ComparisonNode` children

### Requirement: Parser handles precedence correctly
Implicit AND SHALL bind tighter than explicit OR. Parentheses SHALL override precedence.

#### Scenario: Mixed AND and OR without parens
- **WHEN** the input is `c:red t:creature or t:instant`
- **THEN** the AST is `OrNode(AndNode(c:red, t:creature), t:instant)`

#### Scenario: Parentheses override precedence
- **WHEN** the input is `c:red (t:creature or t:instant)`
- **THEN** the AST is `AndNode(c:red, OrNode(t:creature, t:instant))`

### Requirement: Parser handles negation
The parser SHALL produce a `NotNode` wrapping the negated term.

#### Scenario: Negated term
- **WHEN** the input is `-t:creature`
- **THEN** the AST is `NotNode(ComparisonNode(type, :, creature))`

### Requirement: Parser returns Result type with error positions
The parser SHALL return `Result<QueryNode, ParseError>` where `ParseError` includes the character position of the error.

#### Scenario: Unmatched parenthesis
- **WHEN** the input is `(t:creature`
- **THEN** the result is `err` with a ParseError indicating the unmatched `(` position

#### Scenario: Empty query
- **WHEN** the input is an empty string
- **THEN** the result is `err` with a ParseError indicating empty query
