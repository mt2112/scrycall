## ADDED Requirements

### Requirement: Oracle tag query builder expands hierarchy to descendants

The search engine's query builder SHALL implement `buildOtagQuery()` function that: (1) resolves the tag slug/label to a tag_id in `oracle_tags`, (2) retrieves `cached_descendants_json` for that tag, (3) expands to all descendant tag IDs, (4) builds SQL EXISTS clause matching any descendant tag in `oracle_taggings`. The result includes all cards tagged with the tag or any descendant.

#### Scenario: otag query finds cards with tag or descendants
- **WHEN** user queries `otag:ramp` and ramp has descendants [mana-ramp, acceleration, ...]
- **THEN** the system returns cards tagged with ramp, mana-ramp, acceleration, or any other descendant

#### Scenario: Parent-only tags return all leaf taggings
- **WHEN** user queries `otag:removal` (a structural tag with no direct taggings but 10+ descendants)
- **THEN** the system returns cards tagged with any removal-* descendant

#### Scenario: Leaf tags behave same as parent tags
- **WHEN** user queries `otag:flying` (a leaf tag with direct taggings)
- **THEN** the system returns cards tagged with flying (descendants are self if no children)

### Requirement: Oracle tag weight filtering

The search engine query builder SHALL support weight filtering in otag queries. Default behavior SHALL include strong and very_strong weights, excluding median and weak. The system MAY support explicit weight filter syntax (e.g., `otag:ramp!weak` to exclude weak; syntax reserved for future use).

#### Scenario: Default weight filter excludes weak taggings
- **WHEN** user queries `otag:ramp` without weight modifier
- **THEN** the system returns cards with ramp tags of weight very_strong or strong only

#### Scenario: Weight filter can be overridden (future)
- **WHEN** user queries `otag:ramp!all` or similar syntax (if implemented)
- **THEN** the system includes all weights in results

### Requirement: Oracle tag queries support logical operators

The search engine SHALL allow otag queries to be combined with AND, OR, NOT operators identical to existing tag queries. The system SHALL build proper SQL joins and WHERE clauses for complex otag expressions.

#### Scenario: OR'd oracle tags
- **WHEN** user queries `otag:ramp or otag:card-draw`
- **THEN** the system returns cards tagged with ramp OR draw (or both)

#### Scenario: AND'd oracle tags
- **WHEN** user queries `otag:ramp and otag:green`
- **THEN** the system returns cards tagged with BOTH ramp and green

#### Scenario: Negated oracle tags
- **WHEN** user queries `not otag:removal`
- **THEN** the system returns cards NOT tagged with removal or any removal-* descendant

### Requirement: Oracle tag queries integrate with existing search pipeline

The search engine SHALL integrate otag queries seamlessly into the existing query builder dispatcher. The `buildFieldComparisonSql()` function SHALL route field="oracleTag" to `buildOtagQuery()`. Oracle tag queries SHALL work alongside existing operators (o:, t:, c:, is:, etc.) without conflicts.

#### Scenario: Mixed oracle tags and existing operators
- **WHEN** user queries `otag:ramp and t:creature and c:green`
- **THEN** the system returns creatures of type creature, color green, tagged with ramp

#### Scenario: Oracle tags work with sorting and limiting
- **WHEN** user queries `otag:removal order:date`
- **THEN** the system returns removal-tagged cards sorted by release date

### Requirement: Query performance for oracle tag searches

Oracle tag queries SHALL execute in <5ms for typical queries (single tag or OR'd tags with 2-3 options). The system SHALL cache the tag hierarchy (descendants JSON) in memory during query session to avoid repeated lookups.

#### Scenario: Single oracle tag query is fast
- **WHEN** user executes `otag:ramp`
- **THEN** the system returns results in <5ms including database round-trip

#### Scenario: Multiple descendants query performs efficiently
- **WHEN** tag has 50+ descendants
- **THEN** the system queries all descendants in single SQL batch, not N separate queries
