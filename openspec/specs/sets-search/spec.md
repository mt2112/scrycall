## ADDED Requirements

### Requirement: Sets search command with smart term dispatch
The system SHALL provide a `sets [term]` subcommand that searches for MTG sets using a positional argument. The command SHALL implement smart term dispatch: if the term is exactly 4 digits, treat it as a year filter; if the term is 5 characters or fewer and non-numeric, attempt exact set code match first, then fall back to name LIKE; otherwise treat it as a name LIKE search. The command SHALL accept optional `--year <year>`, `--type <type>`, and `--all` flags to explicitly filter or override the smart dispatch.

#### Scenario: Search by name
- **WHEN** `scrycall sets strixhaven` is run
- **THEN** all sets with "strixhaven" in the name are displayed in columnar format (CODE, NAME, YEAR, TYPE)

#### Scenario: Search by exact set code
- **WHEN** `scrycall sets stx` is run
- **THEN** the exact match for set code STX is displayed

#### Scenario: Search by year
- **WHEN** `scrycall sets 2021` is run
- **THEN** all sets released in 2021 are displayed, filtered by default to exclude token/promo/memorabilia types

#### Scenario: Override smart dispatch with flags
- **WHEN** `scrycall sets afr --year 2021` is run
- **THEN** the set code AFR is matched and year filter is applied (redundant but valid)

#### Scenario: Retrieve all set types including promos
- **WHEN** `scrycall sets strixhaven --all` is run
- **THEN** all sets matching "strixhaven" are displayed, including token, memorabilia, and other noisy types

#### Scenario: No argument shows help
- **WHEN** `scrycall sets` is run with no arguments
- **THEN** help text for the sets command is displayed

#### Scenario: No matches found
- **WHEN** `scrycall sets nonexistentset` is run
- **WHEN** the search matches no sets
- **THEN** a message indicates no sets were found

#### Scenario: Empty sets table
- **WHEN** the sets table has no data (user hasn't imported yet)
- **THEN** a message suggests running `scrycall import` to populate the sets database

### Requirement: Sets search output format
The system SHALL display set search results in columnar format with columns: CODE (5 chars, uppercase), NAME (right-padded to ~40 chars), YEAR (extracted from released_at), and TYPE (set_type value). Results SHALL be sorted by release date ascending (oldest first), then by code alphabetically.

#### Scenario: Columnar display
- **WHEN** `scrycall sets 2021` returns multiple results
- **THEN** results are displayed with columns aligned and readable, e.g.:
  ```
  STX  Strixhaven: School of Mages        2021  expansion
  STA  Strixhaven Mystical Archive         2021  masterpiece
  C21  Commander 2021                      2021  commander
  ```

#### Scenario: Default type filtering
- **WHEN** `scrycall sets strixhaven` is run without `--all`
- **THEN** sets with type in [token, memorabilia, minigame, predraft, treasure_chest, vanguard] are excluded from results

### Requirement: Type-specific filtering
The system SHALL support `--type <type>` flag to filter results to a specific set type. Multiple set types can be specified as a comma-separated list. The flag SHALL work with or without `--all`.

#### Scenario: Filter by exact type
- **WHEN** `scrycall sets 2021 --type expansion` is run
- **THEN** only sets from 2021 with type "expansion" are displayed

#### Scenario: Filter by multiple types
- **WHEN** `scrycall sets 2021 --type expansion,commander` is run
- **THEN** sets from 2021 with type "expansion" OR "commander" are displayed

### Requirement: Year-specific filtering
The system SHALL support `--year <year>` flag to filter results to a specific 4-digit year. Multiple years can be specified as a comma-separated list.

#### Scenario: Filter by year
- **WHEN** `scrycall sets strix --year 2021` is run
- **THEN** only sets matching "strix" that were released in 2021 are displayed

#### Scenario: Filter by multiple years
- **WHEN** `scrycall sets --year 2020,2021` is run
- **THEN** all sets released in 2020 or 2021 are displayed