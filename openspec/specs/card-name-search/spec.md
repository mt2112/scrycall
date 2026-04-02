## ADDED Requirements

### Requirement: Prefix card name search
The system SHALL provide a function to search for cards whose names start with a given input string, case-insensitively. Results SHALL be ordered alphabetically by name and limited to a maximum of 10 results.

#### Scenario: Prefix matches multiple cards
- **WHEN** searching for cards with prefix "Lightning"
- **THEN** all cards whose names start with "Lightning" are returned, up to 10 results, ordered alphabetically

#### Scenario: Prefix matches no cards
- **WHEN** searching for cards with prefix "Zzzzz"
- **THEN** an empty result set is returned

#### Scenario: Prefix matching is case-insensitive
- **WHEN** searching for cards with prefix "lightning"
- **THEN** cards with names starting with "Lightning" are matched

### Requirement: Substring card name search
The system SHALL provide a function to search for cards whose names contain a given input string anywhere in the name, case-insensitively. Results SHALL be ordered alphabetically by name and limited to a maximum of 10 results. The function SHALL also return the total count of matching cards.

#### Scenario: Substring matches cards
- **WHEN** searching for cards containing "Bolt"
- **THEN** all cards whose names contain "Bolt" anywhere are returned, up to 10 results

#### Scenario: Substring matches many cards
- **WHEN** searching for cards containing "an" and more than 10 cards match
- **THEN** only the first 10 results are returned along with the total match count

#### Scenario: Substring matching is case-insensitive
- **WHEN** searching for cards containing "bolt"
- **THEN** cards with names containing "Bolt" are matched
