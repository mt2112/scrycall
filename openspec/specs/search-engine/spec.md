## ADDED Requirements

### Requirement: AST to SQL translation for all field types
The search engine SHALL translate each AST node type into parameterized SQL WHERE clauses. User input MUST be passed as parameters, never interpolated into SQL strings.

#### Scenario: Color query with colon operator
- **WHEN** the query is `c:red`
- **THEN** the SQL joins `card_colors` and filters for cards that include color `R`

#### Scenario: Mana value numeric comparison
- **WHEN** the query is `mv>=3`
- **THEN** the SQL includes `cards.cmc >= ?` with parameter `3`

### Requirement: Color queries use set operations
Color queries (`c:`, `color:`) SHALL use set logic:
- `c:rg` / `c>=rg` → colors are a superset of {R, G}
- `c=rg` → colors are exactly {R, G}
- `c<=rg` → colors are a subset of {R, G}
- `c<rg` → colors are a strict subset of {R, G}
- `c>rg` → colors are a strict superset of {R, G}

#### Scenario: Superset color query
- **WHEN** the query is `c>=rg`
- **THEN** the SQL ensures the card has at least colors R and G (may have others)

#### Scenario: Exact color query
- **WHEN** the query is `c=wu`
- **THEN** the SQL ensures the card has exactly colors W and U, no more

### Requirement: Color identity queries follow same set logic
Color identity queries (`id:`, `identity:`) SHALL use the same set operation logic as color queries, but against the `card_color_identity` table.

#### Scenario: Commander identity check
- **WHEN** the query is `id<=wub`
- **THEN** the SQL ensures the card's color identity is a subset of {W, U, B}

### Requirement: Text fields use FTS5 MATCH
Oracle text (`o:`, `oracle:`) and name searches (bare words) SHALL use FTS5 MATCH queries against the `cards_fts` virtual table. Type queries (`t:`, `type:`) SHALL use LIKE for substring matching on `type_line`.

#### Scenario: Oracle text search
- **WHEN** the query is `o:"draw a card"`
- **THEN** the SQL uses FTS5 MATCH with the phrase `"draw a card"`

#### Scenario: Type search with substring match
- **WHEN** the query is `t:creature`
- **THEN** the SQL includes `type_line LIKE ?` with pattern `%creature%` (case-insensitive)

#### Scenario: Bare word name search
- **WHEN** the query is `lightning bolt`
- **THEN** the SQL uses FTS5 MATCH against the name column

### Requirement: Power and toughness handle non-numeric values
Power and toughness comparisons SHALL treat `*` as NULL. Numeric comparisons against `*` SHALL not match.

#### Scenario: Numeric power comparison
- **WHEN** the query is `pow>=4`
- **THEN** cards with numeric power >= 4 match, cards with power `*` do not match

### Requirement: Rarity uses ordinal comparison
Rarity comparisons SHALL use ordinal logic: common < uncommon < rare < mythic.

#### Scenario: Rarity greater-than
- **WHEN** the query is `r>=rare`
- **THEN** cards with rarity `rare` or `mythic` match

### Requirement: Format legality queries
Format queries (`f:`, `format:`) SHALL check the `card_legalities` table for the specified format with status `legal` or `restricted`.

#### Scenario: Modern legal query
- **WHEN** the query is `f:modern`
- **THEN** the SQL joins `card_legalities` where format = `modern` and status IN (`legal`, `restricted`)

### Requirement: AND/OR/NOT compose SQL correctly
`AndNode` SHALL produce `(left AND right)`, `OrNode` SHALL produce `(left OR right)`, `NotNode` SHALL produce `NOT (child)` in the generated SQL.

#### Scenario: Complex nested query
- **WHEN** the query is `c:red (t:creature or t:instant) -kw:flying`
- **THEN** the SQL combines all three conditions with correct AND/OR/NOT grouping

### Requirement: Search orchestrator function
The system SHALL provide a `search(db, queryString)` function that parses the query, builds SQL, executes it, and returns `Result<Card[], ParseError | DbError>`.

#### Scenario: Successful search
- **WHEN** `search(db, "c:red t:creature pow>=4")` is called with a populated database
- **THEN** it returns `ok` with an array of matching Card objects

#### Scenario: Parse error propagation
- **WHEN** `search(db, "(unclosed")` is called
- **THEN** it returns `err` with a ParseError
