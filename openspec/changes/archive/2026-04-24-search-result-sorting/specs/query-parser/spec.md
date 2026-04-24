## ADDED Requirements

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
