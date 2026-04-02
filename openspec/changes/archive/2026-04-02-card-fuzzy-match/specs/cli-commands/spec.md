## MODIFIED Requirements

### Requirement: Card command displays detailed card info
The `card` command SHALL accept a card name and display detailed information for that card. When no exact match is found, the command SHALL fall back to a prefix search, then a substring search. If exactly one card matches, the command SHALL display its full detail automatically. If multiple cards match, the command SHALL display a numbered suggestion list. If no cards match at all, the command SHALL display "Card not found".

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
