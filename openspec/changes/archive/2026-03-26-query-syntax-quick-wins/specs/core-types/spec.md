## MODIFIED Requirements

### Requirement: SearchField enum covers all keywords
The project SHALL define a `SearchField` type covering: `color`, `colorIdentity`, `type`, `oracle`, `mana`, `manaValue`, `power`, `toughness`, `rarity`, `set`, `format`, `keyword`, `name`, `loyalty`, `banned`, `restricted`, and `powtou`.

#### Scenario: All Scryfall keywords map to SearchField
- **WHEN** any supported keyword prefix (c:, t:, o:, m:, mv, pow, tou, r:, s:, e:, f:, kw:, id:, name:, banned:, restricted:, loy, pt) is used
- **THEN** it maps to a specific SearchField value

### Requirement: Parser AST types
The project SHALL define AST node types: `AndNode`, `OrNode`, `NotNode`, `ComparisonNode`, `TextSearchNode`, and `ExactNameNode`. Each node SHALL have a `kind` discriminant field.

#### Scenario: Comparison node structure
- **WHEN** the query `c:red` is parsed
- **THEN** it produces a `ComparisonNode` with `{ kind: "comparison", field: "color", operator: ":", value: "red" }`

#### Scenario: AND node structure
- **WHEN** the query `c:red t:creature` is parsed
- **THEN** it produces an `AndNode` with two child nodes

#### Scenario: ExactName node structure
- **WHEN** the query `!"Lightning Bolt"` is parsed
- **THEN** it produces an `ExactNameNode` with `{ kind: "exactName", value: "Lightning Bolt" }`
