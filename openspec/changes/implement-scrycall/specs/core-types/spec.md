## ADDED Requirements

### Requirement: Result type for error handling
The project SHALL provide a `Result<T, E>` union type with `ok(data)` and `err(error)` constructor functions. Functions that can fail MUST return `Result<T, E>` instead of throwing exceptions.

#### Scenario: Success result
- **WHEN** `ok("hello")` is called
- **THEN** it returns `{ ok: true, data: "hello" }`

#### Scenario: Error result
- **WHEN** `err(new Error("fail"))` is called
- **THEN** it returns `{ ok: false, error: Error("fail") }`

### Requirement: Domain-specific error types
The project SHALL define `ParseError`, `ImportError`, and `DbError` types, each with a `kind` string discriminant field and a `message` string field.

#### Scenario: ParseError includes position
- **WHEN** a parse error occurs at character 15
- **THEN** the error has `{ kind: "parse", message: "...", position: 15 }`

#### Scenario: ImportError includes optional cause
- **WHEN** an import fails due to a network error
- **THEN** the error has `{ kind: "import", message: "...", cause: Error }` where cause is the underlying error

### Requirement: Card interface covers all Scryfall fields
The project SHALL define a `Card` interface with fields: `id`, `oracleId`, `name`, `manaCost`, `cmc`, `typeLine`, `oracleText`, `power`, `toughness`, `colors`, `colorIdentity`, `keywords`, `set`, `setName`, `rarity`, `legalities`, and `loyalty`.

#### Scenario: Card interface is complete
- **WHEN** a Scryfall card object is mapped to a Card
- **THEN** all 17 fields are populated with correctly typed values

### Requirement: Color type restricts to WUBRG
The project SHALL define a `Color` type as the union `'W' | 'U' | 'B' | 'R' | 'G'`.

#### Scenario: Valid color value
- **WHEN** a color value of `'U'` is assigned
- **THEN** it is accepted by the type system

#### Scenario: Invalid color value
- **WHEN** a color value of `'X'` is assigned
- **THEN** it is rejected at compile time

### Requirement: Rarity type covers all values
The project SHALL define a `Rarity` type as the union `'common' | 'uncommon' | 'rare' | 'mythic'`.

#### Scenario: Rarity assignment
- **WHEN** a rarity of `'mythic'` is assigned
- **THEN** it is accepted by the type system

### Requirement: Parser AST types
The project SHALL define AST node types: `AndNode`, `OrNode`, `NotNode`, `ComparisonNode`, and `TextSearchNode`. Each node SHALL have a `kind` discriminant field.

#### Scenario: Comparison node structure
- **WHEN** the query `c:red` is parsed
- **THEN** it produces a `ComparisonNode` with `{ kind: "comparison", field: "color", operator: ":", value: "red" }`

#### Scenario: AND node structure
- **WHEN** the query `c:red t:creature` is parsed
- **THEN** it produces an `AndNode` with two child nodes

### Requirement: SearchField enum covers all keywords
The project SHALL define a `SearchField` type covering: `color`, `colorIdentity`, `type`, `oracle`, `mana`, `manaValue`, `power`, `toughness`, `rarity`, `set`, `format`, `keyword`, and `name`.

#### Scenario: All Scryfall keywords map to SearchField
- **WHEN** any supported keyword prefix (c:, t:, o:, m:, mv, pow, tou, r:, s:, f:, kw:, id:) is used
- **THEN** it maps to a specific SearchField value
