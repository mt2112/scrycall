## MODIFIED Requirements

### Requirement: Search orchestrator function
The system SHALL provide a `search(db, queryString)` function that parses the query, builds SQL with ordering, executes it, and returns `Result<Card[], ParseError | DbError>`. The function SHALL pass the `ParsedQuery` (containing both filter AST and sort options) to the query builder.

#### Scenario: Successful search with default sort
- **WHEN** `search(db, "c:red t:creature pow>=4")` is called with a populated database
- **THEN** it returns `ok` with an array of matching Card objects sorted by name ascending

#### Scenario: Search with explicit sort
- **WHEN** `search(db, "c:red t:creature order:power direction:desc")` is called
- **THEN** it returns `ok` with matching Card objects sorted by power descending

#### Scenario: Parse error propagation
- **WHEN** `search(db, "(unclosed")` is called
- **THEN** it returns `err` with a ParseError

## ADDED Requirements

### Requirement: Query builder generates ORDER BY clause
The query builder SHALL accept a `ParsedQuery` and produce a `SqlQuery` that includes an `orderBy` field. The `orderBy` field SHALL contain a valid SQL ORDER BY expression based on the sort options.

#### Scenario: Default name sort
- **WHEN** the sort options are `{ field: 'name', direction: 'asc' }`
- **THEN** the `orderBy` is `cards.name COLLATE NOCASE ASC`

#### Scenario: CMC descending
- **WHEN** the sort options are `{ field: 'cmc', direction: 'desc' }`
- **THEN** the `orderBy` is `cards.cmc DESC`

#### Scenario: Power sort with NULL handling
- **WHEN** the sort options are `{ field: 'power', direction: 'asc' }`
- **THEN** the `orderBy` SHALL sort numeric power values ascending with non-numeric power values (including `*`) sorted last

#### Scenario: Toughness sort with NULL handling
- **WHEN** the sort options are `{ field: 'toughness', direction: 'desc' }`
- **THEN** the `orderBy` SHALL sort numeric toughness values descending with non-numeric values sorted last

#### Scenario: Rarity sort uses ordinal values
- **WHEN** the sort options are `{ field: 'rarity', direction: 'asc' }`
- **THEN** the `orderBy` sorts using ordinal values: common (0) < uncommon (1) < rare (2) < mythic (3)

#### Scenario: Color sort by color count
- **WHEN** the sort options are `{ field: 'color', direction: 'asc' }`
- **THEN** the `orderBy` sorts by the number of colors the card has (colorless first, then mono, then multi)

#### Scenario: Set sort
- **WHEN** the sort options are `{ field: 'set', direction: 'asc' }`
- **THEN** the `orderBy` is `cards.set_code COLLATE NOCASE ASC`

### Requirement: SqlQuery includes orderBy field
The `SqlQuery` type SHALL include an `orderBy` field of type `string` containing the SQL ORDER BY expression. The `searchCards` function SHALL append this ORDER BY clause to the query.

#### Scenario: ORDER BY appended to search SQL
- **WHEN** `searchCards` receives a `SqlQuery` with `orderBy` set to `cards.name COLLATE NOCASE ASC`
- **THEN** the executed SQL includes `ORDER BY cards.name COLLATE NOCASE ASC`
