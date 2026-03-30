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

### Requirement: Four-color aliases in color queries
The search engine SHALL recognize the four-color alias names `chaos`, `aggression`, `altruism`, `growth`, and `artifice` and map them to their respective color sets:
- `chaos` → {U, B, R, G} (no white)
- `aggression` → {W, B, R, G} (no blue)
- `altruism` → {W, U, R, G} (no black)
- `growth` → {W, U, B, G} (no red)
- `artifice` → {W, U, B, R} (no green)

#### Scenario: Chaos color alias
- **WHEN** the query is `c:chaos`
- **THEN** the SQL filters for cards whose colors are a superset of {U, B, R, G}

#### Scenario: Four-color alias with subset operator
- **WHEN** the query is `id<=growth`
- **THEN** the SQL filters for cards whose color identity is a subset of {W, U, B, G}

### Requirement: Multicolor special value in color queries
The search engine SHALL recognize `multicolor` and `m` as special values in color queries. `c:multicolor` and `c:m` SHALL match cards with 2 or more colors.

#### Scenario: Multicolor query
- **WHEN** the query is `c:multicolor`
- **THEN** the SQL filters for cards with `COUNT(card_colors) > 1`

#### Scenario: Short multicolor alias
- **WHEN** the query is `c:m`
- **THEN** the behavior is identical to `c:multicolor`

#### Scenario: Multicolor with identity
- **WHEN** the query is `id:multicolor`
- **THEN** the SQL filters for cards with `COUNT(card_color_identity) > 1`

### Requirement: Loyalty field numeric queries
The search engine SHALL support numeric queries on the `loyalty` field using the same pattern as power/toughness: cast to numeric, compare with the given operator, exclude NULL and `*` values.

#### Scenario: Exact loyalty match
- **WHEN** the query is `loy=3`
- **THEN** the SQL filters for `CAST(cards.loyalty AS REAL) = 3 AND cards.loyalty IS NOT NULL`

#### Scenario: Loyalty range query
- **WHEN** the query is `loyalty>=5`
- **THEN** the SQL filters for `CAST(cards.loyalty AS REAL) >= 5 AND cards.loyalty IS NOT NULL`

### Requirement: Banned and restricted format queries
The search engine SHALL support `banned:` and `restricted:` keywords that query the `card_legalities` table with `status = 'banned'` and `status = 'restricted'` respectively.

#### Scenario: Banned in format
- **WHEN** the query is `banned:legacy`
- **THEN** the SQL includes `EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = 'legacy' AND status = 'banned')`

#### Scenario: Restricted in format
- **WHEN** the query is `restricted:vintage`
- **THEN** the SQL includes `EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = 'vintage' AND status = 'restricted')`

#### Scenario: Negated banned query
- **WHEN** the query is `-banned:modern`
- **THEN** the SQL excludes cards that are banned in modern

### Requirement: Combined power+toughness queries
The search engine SHALL support `pt` / `powtou` field queries that compare the sum of a card's power and toughness against a numeric value. Cards with non-numeric power or toughness (including `*`) SHALL be excluded.

#### Scenario: Combined stat threshold
- **WHEN** the query is `pt>=10`
- **THEN** the SQL filters for `(CAST(power AS REAL) + CAST(toughness AS REAL)) >= 10` excluding NULL and `*` values

#### Scenario: Exact combined stat
- **WHEN** the query is `pt=4`
- **THEN** the SQL filters for cards whose power + toughness equals 4

### Requirement: Exact name matching with `!` prefix
The search engine SHALL support exact name matching when receiving an `ExactNameNode`. The match SHALL be case-insensitive and match the full card name exactly.

#### Scenario: Exact name match
- **WHEN** the query is `!"Lightning Bolt"`
- **THEN** the SQL filters for `cards.name = 'Lightning Bolt' COLLATE NOCASE`

#### Scenario: Exact name with bare word
- **WHEN** the query is `!bolt`
- **THEN** the SQL filters for `cards.name = 'bolt' COLLATE NOCASE`

### Requirement: Even and odd mana value queries
The search engine SHALL support `mv:even` and `mv:odd` as special string values in mana value queries. `even` SHALL match cards where `cmc % 2 = 0`. `odd` SHALL match cards where `cmc % 2 = 1`.

#### Scenario: Even mana value
- **WHEN** the query is `mv:even`
- **THEN** the SQL filters for `CAST(cards.cmc AS INTEGER) % 2 = 0`

#### Scenario: Odd mana value
- **WHEN** the query is `mv:odd`
- **THEN** the SQL filters for `CAST(cards.cmc AS INTEGER) % 2 = 1`

### Requirement: Cross-field numeric comparisons
The search engine SHALL support comparing numeric fields against each other. When a numeric field's value matches a known field reference (`pow`, `power`, `tou`, `toughness`, `loy`, `loyalty`, `cmc`, `mv`), the query builder SHALL generate a column-to-column SQL comparison instead of a column-to-parameter comparison. Both columns SHALL exclude NULL and `*` values.

#### Scenario: Power greater than toughness
- **WHEN** the query is `pow>tou`
- **THEN** the SQL filters for `CAST(power AS REAL) > CAST(toughness AS REAL)` with NULL and `*` exclusions for both columns

#### Scenario: Toughness equals power
- **WHEN** the query is `tou=pow`
- **THEN** the SQL filters for `CAST(toughness AS REAL) = CAST(power AS REAL)` with NULL and `*` exclusions

#### Scenario: Power greater than loyalty
- **WHEN** the query is `pow>loy`
- **THEN** the SQL filters for `CAST(power AS REAL) > CAST(loyalty AS REAL)` with NULL and `*` exclusions for both columns

### Requirement: is: condition query dispatch
The search engine SHALL dispatch `is:<condition>` queries to a condition-specific SQL builder. Each supported condition name SHALL map to a function that returns a SQL WHERE clause.

#### Scenario: Known condition dispatches to builder
- **WHEN** the query builder receives a ComparisonNode with field `is` and value `spell`
- **THEN** it dispatches to the `is:spell` condition builder

#### Scenario: Unknown condition returns false clause
- **WHEN** the query builder receives a ComparisonNode with field `is` and value `nonexistent`
- **THEN** it returns a SQL clause `1 = 0` matching no cards

### Requirement: not: condition inverts is: condition
The search engine SHALL treat `not:<condition>` as the logical negation of `is:<condition>`. The SQL output SHALL negate the corresponding `is:` condition's WHERE clause.

#### Scenario: not: produces negated SQL
- **WHEN** the query builder receives a ComparisonNode with field `not` and value `spell`
- **THEN** it produces SQL equivalent to NOT (is:spell condition)

### Requirement: has: condition query dispatch
The search engine SHALL dispatch `has:<field>` queries to check for non-null presence of the specified field.

#### Scenario: has:pt generates null checks
- **WHEN** the query builder receives a ComparisonNode with field `has` and value `pt`
- **THEN** it produces SQL: `cards.power IS NOT NULL AND cards.toughness IS NOT NULL`

#### Scenario: has:loyalty generates null check
- **WHEN** the query builder receives a ComparisonNode with field `has` and value `loyalty`
- **THEN** it produces SQL: `cards.loyalty IS NOT NULL`

### Requirement: Numeric color count queries
The search engine SHALL support numeric values in color queries. When the value is a pure integer, it SHALL compare the count of colors rather than matching specific colors.

#### Scenario: Exact color count
- **WHEN** the query is `c=2`
- **THEN** the SQL filters for cards with exactly 2 entries in the `card_colors` table

#### Scenario: Color count comparison
- **WHEN** the query is `c>=3`
- **THEN** the SQL filters for cards with 3 or more entries in the `card_colors` table

#### Scenario: Colorless by count
- **WHEN** the query is `c=0`
- **THEN** the SQL filters for cards with zero entries in the `card_colors` table (equivalent to `c:colorless`)

#### Scenario: Numeric color identity count
- **WHEN** the query is `id=2`
- **THEN** the SQL filters for cards with exactly 2 entries in the `card_color_identity` table

### Requirement: Strixhaven college color aliases
The search engine SHALL recognize Strixhaven college names as color aliases and map them to their two-color combinations.

#### Scenario: silverquill alias
- **WHEN** the query is `c:silverquill`
- **THEN** the SQL filters for cards whose colors are a superset of {W, B}

#### Scenario: prismari alias
- **WHEN** the query is `c:prismari`
- **THEN** the SQL filters for cards whose colors are a superset of {U, R}

#### Scenario: witherbloom alias
- **WHEN** the query is `c:witherbloom`
- **THEN** the SQL filters for cards whose colors are a superset of {B, G}

#### Scenario: lorehold alias
- **WHEN** the query is `c:lorehold`
- **THEN** the SQL filters for cards whose colors are a superset of {R, W}

#### Scenario: quandrix alias
- **WHEN** the query is `c:quandrix`
- **THEN** the SQL filters for cards whose colors are a superset of {G, U}

#### Scenario: College alias with color identity
- **WHEN** the query is `id<=quandrix`
- **THEN** the SQL filters for cards whose color identity is a subset of {G, U}
