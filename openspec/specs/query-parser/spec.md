## ADDED Requirements

### Requirement: Tokenizer recognizes all keyword prefixes
The tokenizer SHALL recognize the following keyword prefixes: `c:`, `color:`, `id:`, `identity:`, `commander:`, `t:`, `type:`, `o:`, `oracle:`, `m:`, `mana:`, `r:`, `rarity:`, `s:`, `set:`, `f:`, `format:`, `kw:`, `keyword:`. It SHALL also recognize bare keyword names `mv`, `manavalue`, `pow`, `power`, `tou`, `toughness` followed by an operator.

#### Scenario: Colon-separated keyword
- **WHEN** the input is `c:red`
- **THEN** the tokenizer produces a keyword token with field `color` and value `red`

#### Scenario: Numeric keyword with operator
- **WHEN** the input is `mv>=3`
- **THEN** the tokenizer produces a keyword token with field `manaValue`, operator `>=`, and value `3`

#### Scenario: Alias keyword
- **WHEN** the input is `pow>4`
- **THEN** the tokenizer produces a keyword token with field `power`, operator `>`, and value `4`

#### Scenario: Commander keyword prefix
- **WHEN** the input is `commander:RG`
- **THEN** the tokenizer produces a keyword token with field `commander`, operator `:`, and value `RG`

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

### Requirement: Tokenizer skips `and` keyword
The tokenizer SHALL recognize `and` (case-insensitive) as an implicit AND operator and skip it without emitting any token. AND is implicit between adjacent terms.

#### Scenario: Query with explicit `and` keyword
- **WHEN** the input is `t:elf and t:cleric`
- **THEN** the tokenizer produces tokens equivalent to `t:elf t:cleric` (two keyword tokens, no `and` token)

#### Scenario: `and` in parenthesized group
- **WHEN** the input is `(t:elf and t:cleric)`
- **THEN** the tokenizer produces: open-paren, keyword(type, elf), keyword(type, cleric), close-paren

#### Scenario: `AND` in uppercase
- **WHEN** the input is `c:red AND t:creature`
- **THEN** the tokenizer produces tokens equivalent to `c:red t:creature`

### Requirement: Tokenizer recognizes `e:` and `edition:` as set aliases
The tokenizer SHALL recognize `e:` and `edition:` as aliases for the `set` search field, equivalent to `s:` and `set:`.

#### Scenario: Short alias `e:`
- **WHEN** the input is `e:war`
- **THEN** the tokenizer produces a keyword token with field `set` and value `war`

#### Scenario: Long alias `edition:`
- **WHEN** the input is `edition:m21`
- **THEN** the tokenizer produces a keyword token with field `set` and value `m21`

### Requirement: Tokenizer recognizes `name:` as explicit name field
The tokenizer SHALL recognize `name:` as a keyword prefix mapping to the `name` search field.

#### Scenario: Explicit name search
- **WHEN** the input is `name:bolt`
- **THEN** the tokenizer produces a keyword token with field `name`, operator `:`, and value `bolt`

#### Scenario: Quoted name search
- **WHEN** the input is `name:"Lightning Bolt"`
- **THEN** the tokenizer produces a keyword token with field `name`, operator `:`, and value `Lightning Bolt`

### Requirement: Tokenizer recognizes `banned:` and `restricted:` keywords
The tokenizer SHALL recognize `banned:` and `restricted:` as keyword prefixes mapping to their respective search fields.

#### Scenario: Banned keyword
- **WHEN** the input is `banned:legacy`
- **THEN** the tokenizer produces a keyword token with field `banned`, operator `:`, and value `legacy`

#### Scenario: Restricted keyword
- **WHEN** the input is `restricted:vintage`
- **THEN** the tokenizer produces a keyword token with field `restricted`, operator `:`, and value `vintage`

### Requirement: Tokenizer recognizes `loyalty`/`loy` as bare keywords
The tokenizer SHALL recognize `loyalty` and `loy` in the bare keyword map, mapping to the `loyalty` search field.

#### Scenario: Loyalty with equals operator
- **WHEN** the input is `loy=3`
- **THEN** the tokenizer produces a keyword token with field `loyalty`, operator `=`, and value `3`

#### Scenario: Loyalty with comparison operator
- **WHEN** the input is `loyalty>=4`
- **THEN** the tokenizer produces a keyword token with field `loyalty`, operator `>=`, and value `4`

### Requirement: Tokenizer recognizes `pt`/`powtou` as bare keywords
The tokenizer SHALL recognize `pt` and `powtou` in the bare keyword map, mapping to the `powtou` search field.

#### Scenario: Combined power+toughness query
- **WHEN** the input is `pt>=10`
- **THEN** the tokenizer produces a keyword token with field `powtou`, operator `>=`, and value `10`

### Requirement: Tokenizer handles `!` exact name prefix
The tokenizer SHALL recognize `!` at the start of a term as an exact name match prefix. The `!` SHALL be followed by either a bare word or a quoted string.

#### Scenario: Exact name with bare word
- **WHEN** the input is `!bolt`
- **THEN** the tokenizer produces an exact-name token with value `bolt`

#### Scenario: Exact name with quoted string
- **WHEN** the input is `!"Lightning Bolt"`
- **THEN** the tokenizer produces an exact-name token with value `Lightning Bolt`

### Requirement: Tokenizer recognizes `is:` keyword prefix
The tokenizer SHALL recognize `is:` as a keyword prefix mapping to the `is` search field.

#### Scenario: is: keyword
- **WHEN** the input is `is:spell`
- **THEN** the tokenizer produces a keyword token with field `is`, operator `:`, and value `spell`

#### Scenario: is: with quoted value
- **WHEN** the input is `is:"french vanilla"`
- **THEN** the tokenizer produces a keyword token with field `is`, operator `:`, and value `french vanilla`

### Requirement: Tokenizer recognizes `not:` keyword prefix
The tokenizer SHALL recognize `not:` as a keyword prefix mapping to the `not` search field. This is distinct from the `-` negation prefix.

#### Scenario: not: keyword
- **WHEN** the input is `not:spell`
- **THEN** the tokenizer produces a keyword token with field `not`, operator `:`, and value `spell`

#### Scenario: not: does not conflict with negation
- **WHEN** the input is `-not:spell`
- **THEN** a negate token precedes the keyword token with field `not`

### Requirement: Tokenizer recognizes `has:` keyword prefix
The tokenizer SHALL recognize `has:` as a keyword prefix mapping to the `has` search field.

#### Scenario: has: keyword
- **WHEN** the input is `has:loyalty`
- **THEN** the tokenizer produces a keyword token with field `has`, operator `:`, and value `loyalty`

### Requirement: Tokenizer recognizes `order:` and `direction:` keywords
The tokenizer SHALL recognize `order:` and `direction:` as keyword prefixes. `order:` SHALL map to the search field `order` and `direction:` SHALL map to the search field `direction`.

#### Scenario: Order keyword token
- **WHEN** the input is `order:name`
- **THEN** the tokenizer produces a keyword token with field `order`, operator `:`, and value `name`

#### Scenario: Direction keyword token
- **WHEN** the input is `direction:desc`
- **THEN** the tokenizer produces a keyword token with field `direction`, operator `:`, and value `desc`

#### Scenario: Order keyword amid filter keywords
- **WHEN** the input is `c:red order:cmc t:creature`
- **THEN** the tokenizer produces three keyword tokens: color, order, and type

### Requirement: Parser extracts sort metadata from token stream
The parser SHALL intercept `order` and `direction` keyword tokens during parsing and accumulate them as sort metadata. These tokens SHALL NOT be added to the filter AST. When multiple `order:` tokens appear, the last one SHALL take precedence. When multiple `direction:` tokens appear, the last one SHALL take precedence.

#### Scenario: Sort keywords excluded from filter AST
- **WHEN** the query `c:red order:cmc` is parsed
- **THEN** the filter AST contains only the color comparison node; the order keyword does not appear in the AST

#### Scenario: Last order wins
- **WHEN** the query `order:name order:cmc` is parsed
- **THEN** the sort field is `cmc`

#### Scenario: Last direction wins
- **WHEN** the query `direction:asc direction:desc` is parsed
- **THEN** the sort direction is `desc`

#### Scenario: Direction without order uses default field
- **WHEN** the query `c:red direction:desc` is parsed
- **THEN** the sort is `{ field: 'name', direction: 'desc' }`

#### Scenario: Order without direction uses default asc
- **WHEN** the query `c:red order:power` is parsed
- **THEN** the sort is `{ field: 'power', direction: 'asc' }`

#### Scenario: Invalid direction value
- **WHEN** the query contains `direction:sideways`
- **THEN** the parser SHALL return a ParseError indicating an invalid sort direction
