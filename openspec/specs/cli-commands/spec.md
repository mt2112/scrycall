## ADDED Requirements

### Requirement: CLI entry point with Commander.js
The system SHALL provide a CLI entry point using Commander.js that registers `import`, `search`, and `card` subcommands. The package.json `bin` field SHALL point to the compiled entry point.

#### Scenario: Help output
- **WHEN** `scrycall --help` is run
- **THEN** it displays available commands: import, search, card

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

### Requirement: Search command parses and executes queries
The `search` command SHALL accept a query string argument, parse it using the query parser, execute it against the database, and display matching cards.

#### Scenario: Successful search
- **WHEN** `scrycall search "c:red t:creature pow>=4"` is run
- **THEN** matching cards are displayed in list format with a count summary

#### Scenario: Parse error display
- **WHEN** `scrycall search "(unclosed"` is run
- **THEN** an error message is displayed indicating the parse error and position

#### Scenario: No results
- **WHEN** the query matches no cards
- **THEN** a message indicates no cards were found

### Requirement: Card command displays detailed card info
The `card` command SHALL accept a card name and display detailed information for that card. When no exact match is found, the command SHALL fall back to a prefix search, then a substring search. If exactly one card matches, the command SHALL display its full detail automatically. If multiple cards match, the command SHALL display a numbered suggestion list. If no cards match at all, the command SHALL display "Card not found".

#### Scenario: Exact name match
- **WHEN** `scrycall card "Lightning Bolt"` is run
- **THEN** the full card detail is displayed (name, mana cost, type, text, set, rarity)

#### Scenario: Single fuzzy match auto-selects
- **WHEN** `scrycall card "Lightning Bo"` is run and only "Lightning Bolt" matches
- **THEN** the full card detail for "Lightning Bolt" is displayed automatically

#### Scenario: Multiple fuzzy matches show numbered suggestions
- **WHEN** `scrycall card "Lightning"` is run and multiple cards match
- **THEN** a numbered list of matching card names is displayed

#### Scenario: Fuzzy matches capped with count
- **WHEN** `scrycall card "Dragon"` is run and more than 10 cards match
- **THEN** 10 suggestions are displayed with a message indicating how many more matches exist

#### Scenario: No match at all
- **WHEN** `scrycall card "Xyzzyplugh"` is run and no cards match
- **THEN** an error message indicates the card was not found
