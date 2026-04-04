## MODIFIED Requirements

### Requirement: Initial schema creates cards table
The initial migration SHALL create a `cards` table with columns: `id` (TEXT PRIMARY KEY), `oracle_id` (TEXT), `name` (TEXT NOT NULL), `mana_cost` (TEXT), `cmc` (REAL), `type_line` (TEXT), `oracle_text` (TEXT), `power` (TEXT), `toughness` (TEXT), `set_code` (TEXT), `set_name` (TEXT), `rarity` (TEXT), `loyalty` (TEXT). A subsequent migration SHALL add the `scryfall_uri` (TEXT) column.

#### Scenario: Cards table exists after migration
- **WHEN** migrations are applied to a fresh database
- **THEN** the `cards` table exists with all specified columns including `scryfall_uri`

## ADDED Requirements

### Requirement: Migration 002 adds scryfall_uri column
The system SHALL provide a migration (002) that adds a `scryfall_uri TEXT` column to the `cards` table. The column SHALL be nullable to support existing databases before re-import.

#### Scenario: Migration adds column to existing database
- **WHEN** migration 002 is applied to a database with only migration 001
- **THEN** the `cards` table gains a `scryfall_uri` column with NULL default

#### Scenario: Fresh database has scryfall_uri after all migrations
- **WHEN** all migrations are applied to a fresh database
- **THEN** the `cards` table includes the `scryfall_uri` column
