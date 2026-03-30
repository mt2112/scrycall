## ADDED Requirements

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
