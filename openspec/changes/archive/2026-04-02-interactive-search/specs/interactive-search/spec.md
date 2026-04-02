## ADDED Requirements

### Requirement: Interactive prompt loop after search results
When stdout is a TTY, the search command SHALL display results with numbered indices and enter an interactive prompt loop. The prompt SHALL display `Enter card number (q to quit): ` and accept user input. The loop SHALL continue until the user exits.

#### Scenario: User selects a card by number
- **WHEN** the user enters a valid number (1–N) at the prompt
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

### Requirement: TTY detection gates interactive mode
The system SHALL use `process.stdout.isTTY` to determine whether to enter interactive mode. When stdout is not a TTY (piped or redirected), the search command SHALL output results in the existing plain-text format without numbers or prompts.

#### Scenario: Piped output remains unchanged
- **WHEN** the search command is run with stdout piped (e.g., `scry search "query" | grep ...`)
- **THEN** the output is the same plain-text card list format as before, with no numbered indices and no prompt

#### Scenario: TTY output enters interactive mode
- **WHEN** the search command is run in a TTY terminal
- **THEN** the results are displayed with numbered indices and the interactive prompt appears

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
