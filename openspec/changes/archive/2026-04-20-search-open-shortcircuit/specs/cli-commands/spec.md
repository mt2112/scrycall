## MODIFIED Requirements

### Requirement: Search command parses and executes queries
The `search` command SHALL accept a query string argument, parse it using the query parser, execute it against the database, and display matching cards. When the `--open` flag is provided and the query succeeds, the command SHALL open the Scryfall search page in the browser immediately, print a confirmation message to stderr, and exit without displaying results to the console or entering the interactive prompt. When `--open` is not provided and stdout is a TTY, the command SHALL display results with numbered indices and enter an interactive prompt loop allowing the user to select a card by number to see its detail. When stdout is not a TTY and `--open` is not provided, the command SHALL display results in the existing plain-text format without numbers or prompts. The search command's action handler SHALL be async to support the interactive readline loop. The command SHALL accept an `--open` flag.

#### Scenario: Successful search
- **WHEN** `scrycall search "c:red t:creature pow>=4"` is run
- **THEN** matching cards are displayed in list format with a count summary

#### Scenario: Parse error display
- **WHEN** `scrycall search "(unclosed"` is run
- **THEN** an error message is displayed indicating the parse error and position

#### Scenario: No results
- **WHEN** the query matches no cards
- **THEN** a message indicates no cards were found

#### Scenario: Interactive search in TTY
- **WHEN** `scrycall search "c:red"` is run in a TTY terminal with results
- **THEN** results are displayed with numbered indices and a selection prompt appears

#### Scenario: Non-interactive search when piped
- **WHEN** `scrycall search "c:red" | cat` is run (stdout piped)
- **THEN** results are displayed in plain-text format with no numbers or prompt

#### Scenario: Open flag opens Scryfall immediately
- **WHEN** `scrycall search "c:red pow>=4" --open` is run
- **THEN** the Scryfall search page opens in the browser at `https://scryfall.com/search?q=c%3Ared+pow%3E%3D4&unique=cards&as=grid` and a confirmation message is printed to stderr. No results are displayed to the console and no interactive prompt is shown.

#### Scenario: Open flag with no results still opens Scryfall
- **WHEN** `scrycall search "t:xyzzy" --open` is run and no local results match
- **THEN** the Scryfall search page still opens in the browser and a confirmation message is printed to stderr. No "no results" message is shown to the console.

#### Scenario: Open flag with parse error does not open browser
- **WHEN** `scrycall search "(unclosed" --open` is run
- **THEN** the parse error is displayed to stderr and the browser is NOT opened
