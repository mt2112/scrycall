## ADDED Requirements

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
