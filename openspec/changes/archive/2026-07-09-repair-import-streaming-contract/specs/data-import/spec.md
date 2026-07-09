## ADDED Requirements

### Requirement: Import execution uses bounded-memory writes
The importer SHALL process parsed oracle_cards data in bounded batches and SHALL NOT retain the full parsed card collection in memory before database writes begin.

#### Scenario: Large import stays bounded by batch strategy
- **WHEN** the importer processes a bulk data stream containing 70,000 or more cards
- **THEN** memory usage scales with the configured batch size and supporting set metadata rather than the total number of parsed cards

#### Scenario: Bounded writes preserve atomic replacement
- **WHEN** an import fails after one or more write batches have been processed
- **THEN** the database still reflects either the pre-import data set or the fully completed new import, but not a partially replaced card corpus