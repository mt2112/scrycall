## MODIFIED Requirements

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
