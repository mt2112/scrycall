## ADDED Requirements

### Requirement: Extract and deduplicate set metadata during import
The importer SHALL extract set metadata (`released_at` and `set_type`) from each Scryfall card object and collect unique sets into a map. After all cards are batch-inserted, the importer SHALL populate the `sets` table by inserting each unique set (code, name, released_at, set_type) using `INSERT OR IGNORE` to handle duplicates gracefully.

#### Scenario: Set metadata extraction
- **WHEN** cards are imported from Scryfall oracle_cards JSON
- **THEN** set metadata (released_at, set_type) is captured from each card

#### Scenario: Deduplication
- **WHEN** 70,000 cards reference 551 unique sets
- **THEN** exactly 551 rows are inserted into the sets table (one per unique set code)

#### Scenario: Released date preservation
- **WHEN** a set has `released_at: "2021-04-23"`
- **THEN** the sets table stores the date string in the released_at column for that set

#### Scenario: Set type preservation
- **WHEN** a set has `set_type: "expansion"`
- **THEN** the sets table stores "expansion" in the set_type column for that set

#### Scenario: Reimport with INSERT OR IGNORE
- **WHEN** `scrycall import --force` is run on an existing database with a sets table
- **THEN** the sets table is updated without duplicate key errors (INSERT OR IGNORE handles it)
