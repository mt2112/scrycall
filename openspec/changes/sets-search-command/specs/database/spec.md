## ADDED Requirements

### Requirement: Sets table schema
The database SHALL include a `sets` table with the following schema:
- `code TEXT PRIMARY KEY` — unique set code (e.g., "stx")
- `name TEXT NOT NULL` — full set name (e.g., "Strixhaven: School of Mages")
- `released_at TEXT` — release date in YYYY-MM-DD format (nullable for old sets without data)
- `set_type TEXT` — set type classification (e.g., "expansion", "commander", "token")

The table SHALL have indexes on `released_at` and `set_type` to support filtering during search operations.

#### Scenario: Sets table creation
- **WHEN** the database is created via migrations
- **THEN** the sets table exists with the specified schema

#### Scenario: Unique set codes
- **WHEN** two cards reference the same set code
- **THEN** the sets table contains exactly one row for that set code (PRIMARY KEY constraint)

#### Scenario: Nullable released_at
- **WHEN** a set has no release date in Scryfall data
- **THEN** the released_at column is NULL for that set

#### Scenario: Indexes for fast filtering
- **WHEN** searching by year (released_at) or type (set_type)
- **THEN** indexes on these columns ensure queries complete quickly
