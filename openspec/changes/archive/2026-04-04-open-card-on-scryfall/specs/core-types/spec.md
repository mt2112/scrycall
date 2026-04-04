## MODIFIED Requirements

### Requirement: Card interface covers all Scryfall fields
The project SHALL define a `Card` interface with fields: `id`, `oracleId`, `name`, `manaCost`, `cmc`, `typeLine`, `oracleText`, `power`, `toughness`, `colors`, `colorIdentity`, `keywords`, `set`, `setName`, `rarity`, `legalities`, `loyalty`, and `scryfallUri`.

#### Scenario: Card interface is complete
- **WHEN** a Scryfall card object is mapped to a Card
- **THEN** all 18 fields are populated with correctly typed values

#### Scenario: scryfallUri is a string or null
- **WHEN** a Card is constructed
- **THEN** the `scryfallUri` field is `string | null`, containing the Scryfall permalink URL or null if unavailable
