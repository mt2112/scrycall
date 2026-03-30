## ADDED Requirements

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
