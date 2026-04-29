## CHANGED Requirements

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
