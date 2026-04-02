## MODIFIED Requirements

### Requirement: Search command parses and executes queries
The `search` command SHALL accept a query string argument, parse it using the query parser, execute it against the database, and display matching cards. When stdout is a TTY, the command SHALL display results with numbered indices and enter an interactive prompt loop allowing the user to select a card by number to see its detail. When stdout is not a TTY, the command SHALL display results in the existing plain-text format without numbers or prompts. The search command's action handler SHALL be async to support the interactive readline loop.

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
