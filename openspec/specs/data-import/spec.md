## ADDED Requirements

### Requirement: Fetch bulk data manifest from Scryfall API
The system SHALL fetch the bulk data manifest from `https://api.scryfall.com/bulk-data` and extract the `download_uri` for the `oracle_cards` type.

#### Scenario: Successful manifest fetch
- **WHEN** the bulk data endpoint is reachable
- **THEN** the system returns the download URI for oracle_cards

#### Scenario: API unreachable
- **WHEN** the bulk data endpoint returns an error or is unreachable
- **THEN** the system returns `err` with an ImportError describing the failure

### Requirement: Download oracle cards with streaming
The system SHALL download the oracle_cards JSON file from the obtained URI. The download SHALL stream data rather than buffering the entire file in memory.

#### Scenario: Successful download
- **WHEN** the download URI is valid
- **THEN** the JSON data is streamed for processing without loading the full ~162 MB into memory

### Requirement: Stream-parse JSON array
The importer SHALL use stream-json to parse the JSON array incrementally, processing cards one at a time as they are parsed.

#### Scenario: Cards are processed incrementally
- **WHEN** the JSON stream contains 70,000+ card objects
- **THEN** memory usage remains bounded (not proportional to total file size)

### Requirement: Batch insert within a single transaction
The importer SHALL insert all card data within a single SQLite transaction. Cards SHALL be inserted in batches using prepared statements. The importer SHALL capture the `scryfall_uri` field from each Scryfall card object and store it in the `scryfall_uri` column.

#### Scenario: Full import completes atomically
- **WHEN** 70,000 cards are imported
- **THEN** either all cards are committed or none are (transaction rollback on failure)

#### Scenario: scryfall_uri is captured during import
- **WHEN** a card with `scryfall_uri: "https://scryfall.com/card/lea/161/lightning-bolt?utm_source=api"` is imported
- **THEN** the `scryfall_uri` column for that card contains the full URL

### Requirement: Populate all auxiliary tables
The importer SHALL populate `card_colors`, `card_color_identity`, `card_keywords`, and `card_legalities` tables from the corresponding Scryfall card fields.

#### Scenario: Card with multiple colors
- **WHEN** a card has `colors: ["W", "U"]`
- **THEN** two rows are inserted into `card_colors` for that card

#### Scenario: Card with legalities
- **WHEN** a card has `legalities: { standard: "legal", modern: "legal", legacy: "banned" }`
- **THEN** three rows are inserted into `card_legalities` with correct format and status values

### Requirement: Rebuild FTS5 index after import
The importer SHALL rebuild the FTS5 index after all cards are inserted to ensure full-text search results are current.

#### Scenario: FTS5 content is searchable after import
- **WHEN** the import completes
- **THEN** FTS5 MATCH queries return results for newly imported cards

### Requirement: Import returns statistics
The importer SHALL return `Result<ImportStats, ImportError>` where `ImportStats` includes `cardCount` (number of cards imported) and `duration` (elapsed time). The `runImport` function SHALL accept an optional `onProgress` callback in `ImportOptions`. When provided, the callback SHALL be invoked at each phase transition in order: `manifest`, `download`, `parse`, `write`, `index`.

#### Scenario: Successful import statistics
- **WHEN** an import completes successfully
- **THEN** the result contains the count of imported cards and the duration

#### Scenario: Progress callback receives all phases in order
- **WHEN** `runImport` is called with an `onProgress` callback and the import completes successfully
- **THEN** the callback is invoked with phases `manifest`, `download`, `parse`, `write`, `index` in that order

#### Scenario: Progress callback is optional
- **WHEN** `runImport` is called without an `onProgress` callback
- **THEN** the import completes normally with no progress reporting

#### Scenario: importCards receives progress callback
- **WHEN** `importCards` is called with an `onProgress` callback
- **THEN** the callback is invoked with `{ phase: 'write' }` before the database transaction and `{ phase: 'index' }` before FTS rebuild
