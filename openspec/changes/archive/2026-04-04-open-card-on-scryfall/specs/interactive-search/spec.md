## MODIFIED Requirements

### Requirement: Interactive prompt loop after search results
When stdout is a TTY, the search command SHALL display results with numbered indices and enter an interactive prompt loop. The prompt SHALL display `Enter card number (o to open, q to quit): ` and accept user input. The loop SHALL continue until the user exits. The prompt SHALL accept `o{N}` input to open a card's Scryfall page in the browser.

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

#### Scenario: User opens card in browser with o prefix
- **WHEN** the user enters `o3` at the prompt and card #3 has a `scryfallUri`
- **THEN** the Scryfall page for card #3 is opened in the default browser and the prompt re-appears

#### Scenario: Open with missing scryfallUri
- **WHEN** the user enters `o2` at the prompt and card #2 has no `scryfallUri`
- **THEN** a message suggests re-importing to enable browser opening and the prompt re-appears

#### Scenario: Invalid open input
- **WHEN** the user enters `o0` or `o99` (out of range)
- **THEN** an error message is displayed and the prompt re-appears
