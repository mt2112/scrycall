### Requirement: is: conditions produce boolean filter queries
The search engine SHALL support `is:<condition>` queries that filter cards based on predefined boolean conditions. Each condition maps to a SQL expression derived from existing card data.

#### Scenario: is:spell filters non-land cards
- **WHEN** the query is `is:spell`
- **THEN** the SQL filters for cards whose type_line does NOT contain "Land" (case-insensitive)

#### Scenario: is:permanent filters permanent types
- **WHEN** the query is `is:permanent`
- **THEN** the SQL filters for cards whose type_line contains any of: "Creature", "Artifact", "Enchantment", "Planeswalker", "Land", or "Battle" (case-insensitive)

#### Scenario: is:historic filters historic cards
- **WHEN** the query is `is:historic`
- **THEN** the SQL filters for cards whose type_line contains "Legendary", "Artifact", or "Saga" (case-insensitive)

#### Scenario: is:vanilla filters vanilla creatures
- **WHEN** the query is `is:vanilla`
- **THEN** the SQL filters for cards whose type_line contains "Creature" AND whose oracle_text is NULL or empty

#### Scenario: is:modal filters modal spells
- **WHEN** the query is `is:modal`
- **THEN** the SQL filters for cards whose oracle_text contains "choose one", "choose two", "choose three", or similar "choose" patterns (case-insensitive)

#### Scenario: is:bear filters 2/2 creatures with cmc 2
- **WHEN** the query is `is:bear`
- **THEN** the SQL filters for cards whose type_line contains "Creature", power = '2', toughness = '2', and cmc = 2

#### Scenario: is:hybrid filters hybrid mana cards
- **WHEN** the query is `is:hybrid`
- **THEN** the SQL filters for cards whose mana_cost contains a hybrid mana symbol pattern like `{W/U}`, `{U/B}`, etc.

#### Scenario: is:phyrexian filters Phyrexian mana cards
- **WHEN** the query is `is:phyrexian`
- **THEN** the SQL filters for cards whose mana_cost contains a Phyrexian mana symbol pattern like `{W/P}`, `{R/P}`, etc.

#### Scenario: is:party filters party-eligible creatures
- **WHEN** the query is `is:party`
- **THEN** the SQL filters for cards whose type_line contains "Creature" AND contains any of: "Cleric", "Rogue", "Warrior", or "Wizard" (case-insensitive)

#### Scenario: is:outlaw filters outlaw creatures
- **WHEN** the query is `is:outlaw`
- **THEN** the SQL filters for cards whose type_line contains "Creature" AND contains any of: "Assassin", "Mercenary", "Pirate", "Rogue", or "Warlock" (case-insensitive)

### Requirement: not: conditions invert is: conditions
The search engine SHALL support `not:<condition>` queries that are semantically equivalent to `-is:<condition>`. The `not:` keyword SHALL negate the condition.

#### Scenario: not:spell filters lands
- **WHEN** the query is `not:spell`
- **THEN** the result is equivalent to `-is:spell`, filtering for cards whose type_line DOES contain "Land"

#### Scenario: not:vanilla filters creatures with oracle text
- **WHEN** the query is `not:vanilla`
- **THEN** the result is equivalent to `-is:vanilla`

### Requirement: has: conditions check for presence of data
The search engine SHALL support `has:<field>` queries that filter for cards where the specified field is non-null and non-empty.

#### Scenario: has:pt filters cards with power and toughness
- **WHEN** the query is `has:pt`
- **THEN** the SQL filters for cards where power IS NOT NULL AND toughness IS NOT NULL

#### Scenario: has:loyalty filters planeswalkers
- **WHEN** the query is `has:loyalty`
- **THEN** the SQL filters for cards where loyalty IS NOT NULL

### Requirement: is: and not: conditions work with negation and boolean logic
The `is:` and `not:` conditions SHALL compose correctly with negation (`-`), AND, OR, and parentheses.

#### Scenario: Negated is: condition
- **WHEN** the query is `-is:spell`
- **THEN** the result is a NOT wrapping the is:spell condition

#### Scenario: is: in OR group
- **WHEN** the query is `is:vanilla or is:bear`
- **THEN** the AST is `OrNode(ComparisonNode(is, :, vanilla), ComparisonNode(is, :, bear))`

#### Scenario: is: combined with other keywords
- **WHEN** the query is `c:red is:spell mv<=3`
- **THEN** all three conditions are ANDed together

### Requirement: Unknown is: condition returns empty results
When an `is:` condition name is not recognized, the query SHALL match no cards rather than error.

#### Scenario: Unknown is: condition
- **WHEN** the query is `is:nonexistent`
- **THEN** the query matches zero cards (SQL: `1 = 0`)

### Requirement: is: conditions support pre-computed tag lookup
The `buildIsQuery` function SHALL first resolve aliases via `TAG_ALIASES` map, then check the hardcoded `IS_CONDITIONS` dict, then fall through to an EXISTS subquery against the `card_tags` table. Unknown conditions (not in dict or table) naturally return zero rows.

#### Scenario: Hardcoded condition still works
- **WHEN** the query is `is:spell`
- **THEN** the SQL uses the existing runtime condition (type_line NOT LIKE '%Land%')

#### Scenario: Tag-based condition uses card_tags
- **WHEN** the query is `is:fetchland`
- **THEN** the SQL uses `EXISTS (SELECT 1 FROM card_tags WHERE card_id = cards.id AND tag = 'fetchland')`

#### Scenario: Alias resolves to canonical tag
- **WHEN** the query is `is:cycleland`
- **THEN** the alias resolves to `bikeland` and the SQL uses `EXISTS (SELECT 1 FROM card_tags WHERE card_id = cards.id AND tag = 'bikeland')`

#### Scenario: Unknown condition returns no results
- **WHEN** the query is `is:nonexistent`
- **THEN** the EXISTS subquery returns no rows (zero matches), same behavior as current `1 = 0`

### Requirement: Tag alias resolution map
The system SHALL maintain a `TAG_ALIASES` map that resolves alternate names to canonical tag names:

| Alias | Canonical |
|-------|-----------|
| cycleland | bikeland |
| bicycleland | bikeland |
| karoo | bounceland |
| snarl | shadowland |
| battleland | tangoland |
| trikeland | triome |
| tricycleland | triome |
| canland | canopyland |
| crowdland | bondland |
| bbdland | bondland |
| battlebondland | bondland |
| creatureland | manland |
| tdfc | transform |

#### Scenario: Alias used in query
- **WHEN** the query is `is:karoo`
- **THEN** the alias resolves to `bounceland` and matches the same cards as `is:bounceland`

### Requirement: Layout-based is: conditions added to hardcoded dict
The `IS_CONDITIONS` dict SHALL include multi-face conditions based on the `layout` column:

| Condition | SQL |
|-----------|-----|
| split | `cards.layout = 'split'` |
| flip | `cards.layout = 'flip'` |
| transform | `cards.layout = 'transform'` |
| dfc | `cards.layout IN ('transform', 'modal_dfc')` |
| mdfc | `cards.layout = 'modal_dfc'` |
| meld | `cards.layout = 'meld'` |
| leveler | `cards.layout = 'leveler'` |

#### Scenario: is:split filters split cards
- **WHEN** the query is `is:split`
- **THEN** the SQL filters for cards where layout = 'split'

#### Scenario: is:dfc includes both transform and modal DFC
- **WHEN** the query is `is:dfc`
- **THEN** the SQL filters for cards where layout IN ('transform', 'modal_dfc')

#### Scenario: is:tdfc resolves via alias to transform
- **WHEN** the query is `is:tdfc`
- **THEN** the alias resolves to `transform` and filters for layout = 'transform'

### Requirement: not: conditions work with tag-based is: conditions
The `not:` keyword SHALL work with tag-based conditions. `not:fetchland` SHALL be equivalent to `-is:fetchland`, producing a NOT EXISTS subquery.

#### Scenario: not:fetchland excludes fetchlands
- **WHEN** the query is `not:fetchland`
- **THEN** the SQL uses `NOT EXISTS (SELECT 1 FROM card_tags WHERE card_id = cards.id AND tag = 'fetchland')`

### Requirement: has: conditions work with tag-based is: conditions
Existing `has:` conditions (pt, loyalty) SHALL continue to work unchanged. No new `has:` conditions are added in this change.
