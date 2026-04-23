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
The `search` command SHALL accept a query string argument, parse it using the query parser, execute it against the database, and display matching cards. When the `--open` flag is provided and the query succeeds, the command SHALL open the Scryfall search page in the browser immediately, print a confirmation message to stderr, and exit without displaying results to the console or entering the interactive prompt. When the `--interactive` / `-i` flag is provided and stdout is a TTY, the command SHALL display results with numbered indices and enter an interactive prompt loop allowing the user to select a card by number to see its detail. When `--interactive` is provided but stdout is not a TTY, the flag SHALL be silently ignored. When neither `--open` nor `--interactive` is provided, the command SHALL display results in plain-text format without numbers or prompts regardless of TTY status. The search command's action handler SHALL be async to support the interactive readline loop. The command SHALL accept `--open`, `--interactive` / `-i` flags.

#### Scenario: Successful search
- **WHEN** `scrycall search "c:red t:creature pow>=4"` is run
- **THEN** matching cards are displayed in plain-text list format with a count summary

#### Scenario: Parse error display
- **WHEN** `scrycall search "(unclosed"` is run
- **THEN** an error message is displayed indicating the parse error and position

#### Scenario: No results
- **WHEN** the query matches no cards
- **THEN** a message indicates no cards were found

#### Scenario: Interactive search with -i flag in TTY
- **WHEN** `scrycall search "c:red" -i` is run in a TTY terminal with results
- **THEN** results are displayed with numbered indices and a selection prompt appears

#### Scenario: Default search in TTY shows plain list
- **WHEN** `scrycall search "c:red"` is run in a TTY terminal without `-i`
- **THEN** results are displayed in plain-text format with no numbers or prompt

#### Scenario: Non-interactive search when piped
- **WHEN** `scrycall search "c:red" | cat` is run (stdout piped)
- **THEN** results are displayed in plain-text format with no numbers or prompt

#### Scenario: Interactive flag ignored when piped
- **WHEN** `scrycall search "c:red" -i | cat` is run (stdout piped)
- **THEN** results are displayed in plain-text format with no numbers or prompt; the `-i` flag is silently ignored

#### Scenario: Open flag opens Scryfall immediately
- **WHEN** `scrycall search "c:red pow>=4" --open` is run
- **THEN** the Scryfall search page opens in the browser at `https://scryfall.com/search?q=c%3Ared+pow%3E%3D4&unique=cards&as=grid` and a confirmation message is printed to stderr. No results are displayed to the console and no interactive prompt is shown.

#### Scenario: Open flag with no results still opens Scryfall
- **WHEN** `scrycall search "t:xyzzy" --open` is run and no local results match
- **THEN** the Scryfall search page still opens in the browser and a confirmation message is printed to stderr. No "no results" message is shown to the console.

#### Scenario: Open flag with parse error does not open browser
- **WHEN** `scrycall search "(unclosed" --open` is run
- **THEN** the parse error is displayed to stderr and the browser is NOT opened

#### Scenario: Open flag takes precedence over interactive
- **WHEN** `scrycall search "c:red" --open -i` is run
- **THEN** the browser opens with Scryfall search. The `-i` flag is ignored and no interactive prompt is shown.

### Requirement: Card command displays detailed card info
The `card` command SHALL accept a card name and display detailed information for that card. When no exact match is found, the command SHALL fall back to a prefix search, then a substring search. If exactly one card matches, the command SHALL display its full detail automatically. If multiple cards match, the command SHALL display a numbered suggestion list. If no cards match at all, the command SHALL display "Card not found". The command SHALL accept an `--open` flag.

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

#### Scenario: Open flag with exact match
- **WHEN** `scrycall card "Lightning Bolt" --open` is run and the card has a `scryfallUri`
- **THEN** the card detail is displayed AND the Scryfall page is opened in the default browser

#### Scenario: Open flag with no scryfall_uri
- **WHEN** `scrycall card "Lightning Bolt" --open` is run and the card has no `scryfallUri`
- **THEN** the card detail is displayed and a message suggests re-importing to enable `--open`

#### Scenario: Open flag with multiple matches
- **WHEN** `scrycall card "Lightning" --open` is run and multiple cards match
- **THEN** the numbered suggestion list is displayed without opening a browser (user must specify the exact card)
