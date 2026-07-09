## ADDED Requirements

### Requirement: Tokenizer recognizes otag: keyword operator

The tokenizer SHALL recognize `otag:` as a keyword operator, similar to existing operators `o:`, `t:`, `c:`, `is:`, etc. The system SHALL parse `otag:TAG` tokens into keyword comparison nodes with field="oracleTag".

#### Scenario: otag operator is tokenized
- **WHEN** input is `otag:ramp`
- **THEN** the tokenizer produces a keyword token with operator="otag" and value="ramp"

#### Scenario: Multiple otag operators are parsed
- **WHEN** input is `otag:ramp or otag:draw`
- **THEN** the tokenizer produces two otag tokens, combined with OR logic

#### Scenario: otag works with negation
- **WHEN** input is `-otag:ramp` or `not otag:ramp`
- **THEN** the tokenizer produces a negated otag token

### Requirement: Query parser builds AST nodes for otag operator

The parser SHALL build AST nodes for otag operators identical to existing keyword operators (e.g., `is:`). The parser SHALL support hierarchy expansion syntax if defined (e.g., `otag:removal` expands to all removal-* descendants).

#### Scenario: otag query is parsed into AST
- **WHEN** input is `otag:ramp`
- **THEN** the parser builds an AST node `{kind: 'comparison', field: 'oracleTag', operator: 'otag', value: 'ramp'}`

#### Scenario: Complex queries with otag are parsed correctly
- **WHEN** input is `otag:ramp and (c:green or c:blue)`
- **THEN** the parser builds nested AST with otag node AND'd with color nodes
