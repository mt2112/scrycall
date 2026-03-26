## ADDED Requirements

### Requirement: SQLite database connection with WAL mode
The system SHALL open or create a SQLite database at a configurable path (default: `~/.scrycall/cards.db`), enable WAL journal mode, and enable foreign keys.

#### Scenario: First launch creates database
- **WHEN** the application runs for the first time
- **THEN** it creates the database file and parent directory if they don't exist

#### Scenario: WAL mode is enabled
- **WHEN** the database connection is opened
- **THEN** `PRAGMA journal_mode` returns `wal`

### Requirement: Migration system tracks applied versions
The system SHALL maintain a `_migrations` table tracking which migrations have been applied. Migrations are versioned `.sql` files read from the migrations directory.

#### Scenario: Fresh database applies all migrations
- **WHEN** the database has no `_migrations` table
- **THEN** all migration files are applied in version order

#### Scenario: Existing database applies only new migrations
- **WHEN** the database has migrations 001 and 002 applied, and migration 003 exists
- **THEN** only migration 003 is applied

### Requirement: Initial schema creates cards table
The initial migration SHALL create a `cards` table with columns: `id` (TEXT PRIMARY KEY), `oracle_id` (TEXT), `name` (TEXT NOT NULL), `mana_cost` (TEXT), `cmc` (REAL), `type_line` (TEXT), `oracle_text` (TEXT), `power` (TEXT), `toughness` (TEXT), `set_code` (TEXT), `set_name` (TEXT), `rarity` (TEXT), `loyalty` (TEXT).

#### Scenario: Cards table exists after migration
- **WHEN** migrations are applied to a fresh database
- **THEN** the `cards` table exists with all specified columns

### Requirement: Auxiliary tables for array fields
The initial migration SHALL create `card_colors`, `card_color_identity`, `card_keywords`, and `card_legalities` tables with foreign keys to `cards.id`.

#### Scenario: Color data is normalized
- **WHEN** a card with colors ["W", "U"] is inserted
- **THEN** `card_colors` has two rows referencing the card's id

#### Scenario: Legality data is normalized
- **WHEN** a card with legalities `{ standard: "legal", modern: "banned" }` is inserted
- **THEN** `card_legalities` has rows with format and status columns

### Requirement: FTS5 virtual table for text search
The initial migration SHALL create an FTS5 virtual table indexing the `name`, `oracle_text`, and `type_line` columns from the `cards` table.

#### Scenario: FTS5 table supports MATCH queries
- **WHEN** a card with name "Lightning Bolt" exists
- **THEN** `SELECT * FROM cards_fts WHERE cards_fts MATCH 'lightning'` returns a result

### Requirement: Query helpers return typed results
The system SHALL provide helper functions for common queries: `searchCards(sql, params)` returning `Card[]` and `getCardByName(name)` returning `Card | undefined`.

#### Scenario: searchCards returns mapped Card objects
- **WHEN** `searchCards` is called with a valid SQL WHERE clause
- **THEN** it returns an array of Card objects with all fields populated including joined array data
