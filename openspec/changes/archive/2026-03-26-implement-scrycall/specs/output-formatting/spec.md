## ADDED Requirements

### Requirement: Card detail formatting
The system SHALL provide a `formatCardDetail(card)` function that produces a multi-line string showing: name, mana cost, type line, oracle text, power/toughness (if creature), loyalty (if planeswalker), set, and rarity.

#### Scenario: Creature card detail
- **WHEN** `formatCardDetail` is called for a creature card
- **THEN** the output includes name, mana cost, type line, oracle text, power/toughness, set, and rarity on separate lines

#### Scenario: Planeswalker card detail
- **WHEN** `formatCardDetail` is called for a planeswalker
- **THEN** the output includes loyalty instead of power/toughness

### Requirement: Card list formatting
The system SHALL provide a `formatCardList(cards)` function that produces a compact list with one line per card showing name, mana cost, and type line.

#### Scenario: Multiple cards
- **WHEN** `formatCardList` is called with 5 cards
- **THEN** the output has 5 lines, each showing name, mana cost, and type

#### Scenario: Empty results
- **WHEN** `formatCardList` is called with an empty array
- **THEN** the output indicates no cards found

### Requirement: Output to stdout
The system SHALL provide display functions that write formatted output to stdout.

#### Scenario: Search results display
- **WHEN** search results are ready
- **THEN** the formatted card list followed by a count summary is written to stdout
