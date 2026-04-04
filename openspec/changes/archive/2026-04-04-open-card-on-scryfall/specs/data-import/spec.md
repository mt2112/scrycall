## MODIFIED Requirements

### Requirement: Batch insert within a single transaction
The importer SHALL insert all card data within a single SQLite transaction. Cards SHALL be inserted in batches using prepared statements. The importer SHALL capture the `scryfall_uri` field from each Scryfall card object and store it in the `scryfall_uri` column.

#### Scenario: Full import completes atomically
- **WHEN** 70,000 cards are imported
- **THEN** either all cards are committed or none are (transaction rollback on failure)

#### Scenario: scryfall_uri is captured during import
- **WHEN** a card with `scryfall_uri: "https://scryfall.com/card/lea/161/lightning-bolt?utm_source=api"` is imported
- **THEN** the `scryfall_uri` column for that card contains the full URL
