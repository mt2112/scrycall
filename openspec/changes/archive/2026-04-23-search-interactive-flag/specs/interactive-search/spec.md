## MODIFIED Requirements

### Requirement: Interactive prompt loop after search results
When the `--interactive` / `-i` flag is provided and stdout is a TTY and the `--open` flag is NOT provided, the search command SHALL display results with numbered indices and enter an interactive prompt loop. The prompt SHALL display `Enter card number (o to open, q to quit): ` and accept user input. The loop SHALL continue until the user exits. The prompt SHALL accept `o{N}` input to open a card's Scryfall page in the browser. When `--interactive` is NOT provided, the interactive prompt loop SHALL be skipped entirely regardless of TTY status.

#### Scenario: User selects a card by number
- **WHEN** the user runs `scrycall search "c:red" -i` in a TTY and enters a valid number (1–N) at the prompt
- **THEN** the full card detail is displayed, and the prompt re-appears

#### Scenario: User enters q to quit
- **WHEN** the user enters `q` at the prompt
- **THEN** the interactive loop exits and the process terminates

#### Scenario: User presses Enter with no input to quit
- **WHEN** the user enters an empty line at the prompt
- **THEN** the interactive loop exits and the process terminates

#### Scenario: User enters an invalid number
- **WHEN** the user enters a number outside the range 1–N or a non-numeric non-quit string
- **THEN** an error message is displayed and the prompt re-appears

#### Scenario: User opens card in browser with o prefix
- **WHEN** the user enters `o3` at the prompt and card #3 has a `scryfallUri`
- **THEN** the Scryfall page for card #3 is opened in the default browser and the prompt re-appears

#### Scenario: Open with missing scryfallUri
- **WHEN** the user enters `o2` at the prompt and card #2 has no `scryfallUri`
- **THEN** a message suggests re-importing to enable browser opening and the prompt re-appears

#### Scenario: Invalid open input
- **WHEN** the user enters `o0` or `o99` (out of range)
- **THEN** an error message is displayed and the prompt re-appears

#### Scenario: Interactive prompt skipped without -i flag
- **WHEN** `scrycall search "c:red"` is run in a TTY terminal without `-i`
- **THEN** the interactive prompt loop is NOT entered — plain-text results are displayed

#### Scenario: Interactive prompt skipped with --open flag
- **WHEN** `scrycall search "c:red" --open -i` is run in a TTY terminal
- **THEN** the interactive prompt loop is NOT entered — the browser opens directly instead

### Requirement: Flag-based interactive mode activation
The system SHALL use the `--interactive` / `-i` flag combined with `process.stdout.isTTY` to determine whether to enter interactive mode. The `-i` flag alone is necessary but not sufficient — stdout must also be a TTY. When stdout is not a TTY, the `-i` flag SHALL be silently ignored. When `-i` is not provided, the search command SHALL always output the plain-text card list format without numbers or prompts.

#### Scenario: Interactive flag in TTY enters interactive mode
- **WHEN** `scrycall search "c:red" -i` is run in a TTY terminal
- **THEN** the results are displayed with numbered indices and the interactive prompt appears

#### Scenario: Interactive flag in pipe is silently ignored
- **WHEN** `scrycall search "c:red" -i | cat` is run (stdout piped)
- **THEN** the output is the plain-text card list format with no numbered indices and no prompt

#### Scenario: No flag in TTY shows plain output
- **WHEN** `scrycall search "c:red"` is run in a TTY terminal without `-i`
- **THEN** the output is the plain-text card list format with no numbered indices and no prompt

### Requirement: Database kept open during interactive loop
The system SHALL keep the database connection open for the duration of the interactive prompt loop so that card detail lookups do not require reconnecting.

#### Scenario: Multiple card selections use same connection
- **WHEN** the user selects card number 1 then card number 3
- **THEN** both card details are retrieved successfully without reopening the database

### Requirement: Readline-based input
The system SHALL use the `node:readline` built-in module to read user input during the interactive prompt loop.

#### Scenario: Readline interface created and closed
- **WHEN** interactive mode starts and the user later quits
- **THEN** a readline interface is created at the start and closed upon exit
