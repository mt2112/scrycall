## ADDED Requirements

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
