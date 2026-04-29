## CHANGED Requirements

### Requirement: buildIsQuery falls through to card_tags table
The `buildIsQuery` function SHALL resolve aliases first, then check the hardcoded `IS_CONDITIONS` dict, then fall through to an EXISTS subquery against `card_tags`. The fallthrough query SHALL be parameterized to prevent SQL injection.

#### Scenario: Known hardcoded condition
- **WHEN** `buildIsQuery("spell")` is called
- **THEN** the result uses the `IS_CONDITIONS["spell"]` runtime SQL

#### Scenario: Tag-based condition
- **WHEN** `buildIsQuery("fetchland")` is called
- **THEN** the result is `{ joins: [], where: "EXISTS (SELECT 1 FROM card_tags WHERE card_id = cards.id AND tag = ?)", params: ["fetchland"] }`

#### Scenario: Aliased condition
- **WHEN** `buildIsQuery("karoo")` is called
- **THEN** the alias resolves to "bounceland" and the result uses `params: ["bounceland"]`

### Requirement: buildNotConditionQuery works with tag fallthrough
The `buildNotConditionQuery` function SHALL correctly negate tag-based conditions by wrapping the EXISTS subquery in NOT.

#### Scenario: Negated tag condition
- **WHEN** `buildNotConditionQuery("fetchland")` is called
- **THEN** the result uses `NOT EXISTS (SELECT 1 FROM card_tags WHERE card_id = cards.id AND tag = 'fetchland')`

### Requirement: Layout conditions in IS_CONDITIONS dict
The `IS_CONDITIONS` dict SHALL include entries for layout-based conditions: `split`, `flip`, `transform`, `dfc`, `mdfc`, `meld`, `leveler`.

#### Scenario: is:split SQL
- **WHEN** `buildIsQuery("split")` is called
- **THEN** the result is `{ joins: [], where: "cards.layout = 'split'", params: [] }`

#### Scenario: is:dfc SQL
- **WHEN** `buildIsQuery("dfc")` is called
- **THEN** the result is `{ joins: [], where: "cards.layout IN ('transform', 'modal_dfc')", params: [] }`
