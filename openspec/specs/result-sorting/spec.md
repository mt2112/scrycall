## ADDED Requirements

### Requirement: SortOptions type for result ordering
The system SHALL define a `SortOptions` type representing how search results should be ordered. `SortOptions` SHALL contain a `field` property of type `SortField` and a `direction` property with values `'asc'` or `'desc'`. `SortField` SHALL be a union of `'name'` | `'cmc'` | `'power'` | `'toughness'` | `'rarity'` | `'color'` | `'set'`.

#### Scenario: Default sort options
- **WHEN** no `order:` or `direction:` keyword is present in a query
- **THEN** the default SortOptions SHALL be `{ field: 'name', direction: 'asc' }`

### Requirement: ParsedQuery wraps filter AST and sort options
The system SHALL define a `ParsedQuery` type containing a `filter` property of type `QueryNode` and a `sort` property of type `SortOptions`. The parser SHALL return `Result<ParsedQuery, ParseError>` instead of `Result<QueryNode, ParseError>`.

#### Scenario: Query with no sort keywords
- **WHEN** the query `c:red t:creature` is parsed
- **THEN** the result contains `filter` as the AND node and `sort` as `{ field: 'name', direction: 'asc' }`

#### Scenario: Query with sort keywords
- **WHEN** the query `c:red order:cmc direction:desc` is parsed
- **THEN** the result contains `filter` as the color comparison node and `sort` as `{ field: 'cmc', direction: 'desc' }`

### Requirement: Order field keyword maps sort field aliases
The system SHALL map `order:` values to `SortField` using these aliases: `name` → `name`, `cmc` → `cmc`, `mv` → `cmc`, `power` → `power`, `pow` → `power`, `toughness` → `toughness`, `tou` → `toughness`, `rarity` → `rarity`, `color` → `color`, `set` → `set`.

#### Scenario: Short alias for order field
- **WHEN** the query contains `order:pow`
- **THEN** the sort field resolves to `power`

#### Scenario: Long form for order field
- **WHEN** the query contains `order:toughness`
- **THEN** the sort field resolves to `toughness`

#### Scenario: Invalid order field
- **WHEN** the query contains `order:invalid`
- **THEN** the parser SHALL return a ParseError indicating an unknown sort field
