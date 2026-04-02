## MODIFIED Requirements

### Requirement: Import command downloads and populates database
The `import` command SHALL download oracle_cards from the Scryfall Bulk Data API and populate the local SQLite database. A `--force` flag SHALL force re-download even if data is recent. The command SHALL display a status message for each import phase as it begins: fetching catalog, downloading data, parsing cards, writing to database, and rebuilding search index.

#### Scenario: First import with progress messages
- **WHEN** `scrycall import` is run with no existing database
- **THEN** it displays phase messages as each stage begins, followed by a final summary with card count and duration

#### Scenario: Force re-import
- **WHEN** `scrycall import --force` is run with an existing database
- **THEN** it re-downloads and re-imports all cards regardless of freshness, displaying phase messages throughout

#### Scenario: Import failure displays error
- **WHEN** `scrycall import` is run and a phase fails
- **THEN** the last phase message is visible and an error message is displayed
