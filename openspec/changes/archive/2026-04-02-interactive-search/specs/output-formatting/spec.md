## MODIFIED Requirements

### Requirement: Output to stdout
The system SHALL provide display functions that write formatted output to stdout. For interactive search mode, the system SHALL provide a function to display numbered search results using `formatNumberedCardList` followed by a count summary.

#### Scenario: Search results display
- **WHEN** search results are ready
- **THEN** the formatted card list followed by a count summary is written to stdout

#### Scenario: Interactive search results display
- **WHEN** search results are ready and the search is in interactive (TTY) mode
- **THEN** a numbered card list followed by a count summary is written to stdout
