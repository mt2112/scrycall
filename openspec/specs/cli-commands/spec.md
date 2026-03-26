## ADDED Requirements

### Requirement: CLI entry point with Commander.js
The system SHALL provide a CLI entry point using Commander.js that registers `import`, `search`, and `card` subcommands. The package.json `bin` field SHALL point to the compiled entry point.

#### Scenario: Help output
- **WHEN** `scrycall --help` is run
- **THEN** it displays available commands: import, search, card

### Requirement: Import command downloads and populates database
The `import` command SHALL download oracle_cards from the Scryfall Bulk Data API and populate the local SQLite database. A `--force` flag SHALL force re-download even if data is recent.

#### Scenario: First import
- **WHEN** `scrycall import` is run with no existing database
- **THEN** it creates the database, downloads oracle_cards, imports all cards, and displays the card count

#### Scenario: Force re-import
- **WHEN** `scrycall import --force` is run with an existing database
- **THEN** it re-downloads and re-imports all cards regardless of freshness

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
The `card` command SHALL accept a card name and display detailed information for that card.

#### Scenario: Exact name match
- **WHEN** `scrycall card "Lightning Bolt"` is run
- **THEN** the full card detail is displayed (name, mana cost, type, text, set, rarity)

#### Scenario: Card not found
- **WHEN** `scrycall card "Nonexistent Card"` is run
- **THEN** an error message indicates the card was not found
