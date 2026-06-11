## ADDED Requirements

### Requirement: Tagger module evaluates card tag rules at import time
The system SHALL provide a tagger module (`src/import/tagger.ts`) that exports a `tagCard(card: ScryfallCard): string[]` function. This function evaluates the card against all tag rules and returns an array of matching tag names.

#### Scenario: Card matching multiple tags
- **WHEN** a card is a legendary creature land (e.g., Dryad Arbor-like)
- **THEN** `tagCard` returns tags for all matching conditions

#### Scenario: Card matching no tags
- **WHEN** a vanilla common creature with no special properties is evaluated
- **THEN** `tagCard` returns an empty array

### Requirement: Tag rules are pure functions on ScryfallCard
Each tag rule SHALL be a pure function `(card: ScryfallCard) => boolean` stored in a `TAG_RULES` record. Rules SHALL inspect only the card's properties (name, type_line, oracle_text, keywords, layout, mana_cost) with no database access or side effects.

#### Scenario: Tag rule for fetchland
- **WHEN** a card has type_line containing "Land" AND oracle_text containing "Search your library for" AND "pay 1 life" AND "put it onto the battlefield"
- **THEN** the fetchland rule returns true

#### Scenario: Tag rule for dual
- **WHEN** a card's name is one of the 10 original dual lands (Tundra, Underground Sea, Badlands, Taiga, Savannah, Scrubland, Volcanic Island, Bayou, Plateau, Tropical Island)
- **THEN** the dual rule returns true

#### Scenario: Tag rule rejects non-matching card
- **WHEN** a card does not match the fetchland criteria (e.g., Evolving Wilds — no "pay 1 life")
- **THEN** the fetchland rule returns false

### Requirement: Land nickname tag rules
The tagger SHALL include rules for the following land cycle tags:

| Tag | Match criteria |
|-----|---------------|
| dual | Name is one of the 10 original dual lands |
| fetchland | Land + "Search your library for" + "pay 1 life" + "put it onto the battlefield" |
| shockland | Type line has two basic land types + "pay 2 life" |
| checkland | Land + "unless you control a" + basic land type reference |
| fastland | Land + "two or fewer other lands" |
| slowland | Land + "two or more other lands" |
| painland | Land + "deals 1 damage to you" |
| gainland | Land + "enters tapped" + "gain 1 life" |
| scryland | Land + "enters tapped" + "scry 1" |
| bounceland | Land + "return a land" + "enters tapped" |
| bikeland | Two basic land types in type line + "Cycling" in keywords |
| triome | Three basic land types in type line + "Cycling" in keywords |
| tangoland | Two basic land types in type line + "two or more basic lands" |
| bondland | Land + "two or more opponents" |
| canopyland | Land + "sacrifice" + "draw a card" + "pay 1 life" |
| shadowland | Land + "unless" + "reveal" + basic land type |
| filterland | Land + "{1}, {T}: Add" |
| storageland | Land + "storage counter" |
| surveilland | Land + "enters tapped" + "surveil 1" |
| manland | Land + oracle matches "becomes a" followed by creature text |
| pathway | layout = "modal_dfc" + type line includes "Land" |

#### Scenario: Flooded Strand tagged as fetchland
- **WHEN** a card named "Flooded Strand" with oracle_text containing "pay 1 life, Sacrifice Flooded Strand: Search your library for a Plains or Island card, put it onto the battlefield" is evaluated
- **THEN** `tagCard` returns an array including "fetchland"

#### Scenario: Evolving Wilds not tagged as fetchland
- **WHEN** a card named "Evolving Wilds" with oracle_text containing "Sacrifice Evolving Wilds: Search your library for a basic land card" (no "pay 1 life")
- **THEN** `tagCard` returns an array NOT including "fetchland"

#### Scenario: Temple of Epiphany tagged as scryland
- **WHEN** a card with oracle_text containing "enters tapped" and "scry 1" and type_line containing "Land"
- **THEN** `tagCard` returns an array including "scryland"

### Requirement: Commander/format tag rules
The tagger SHALL include rules for the following commander-related tags:

| Tag | Match criteria |
|-----|---------------|
| commander | (Legendary + (Creature OR Planeswalker)) OR oracle contains "can be your commander" |
| partner | "Partner" in keywords array |
| companion | Oracle contains "Companion —" |
| brawler | Legendary + (Creature OR Planeswalker) |
| oathbreaker | Type line contains "Planeswalker" |

#### Scenario: Legendary creature tagged as commander
- **WHEN** a card with type_line "Legendary Creature — Elf Warrior"
- **THEN** `tagCard` returns an array including "commander" and "brawler"

#### Scenario: Non-legendary creature not tagged as commander
- **WHEN** a card with type_line "Creature — Goblin"
- **THEN** `tagCard` returns an array NOT including "commander"

#### Scenario: Card with Partner keyword tagged
- **WHEN** a card with keywords including "Partner"
- **THEN** `tagCard` returns an array including "partner"

### Requirement: Multi-face tags are NOT pre-computed
Multi-face conditions (split, flip, transform, dfc, mdfc, meld, leveler) SHALL be handled as runtime SQL checks in the `IS_CONDITIONS` dict using the `layout` column, NOT as pre-computed tags. The tagger SHALL NOT include rules for these conditions.
