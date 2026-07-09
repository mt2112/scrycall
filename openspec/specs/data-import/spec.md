## Purpose

The import system SHALL fetch and parse Scryfall bulk data to populate the cards database. It SHALL support downloading oracle cards with streaming, batch processing, atomic transactions, and comprehensive full-text search indexing.
## Requirements
### Requirement: Fetch bulk data manifest from Scryfall API
The system SHALL fetch the bulk data manifest from `https://api.scryfall.com/bulk-data` and extract the `download_uri` for the `oracle_cards` type. The request SHALL include an explicit `User-Agent` header identifying the application as `scrycall` and an explicit `Accept` header.

#### Scenario: Successful manifest fetch
- **WHEN** the bulk data endpoint is reachable
- **THEN** the system returns the download URI for oracle_cards

#### Scenario: API unreachable
- **WHEN** the bulk data endpoint returns an error or is unreachable
- **THEN** the system returns `err` with an ImportError describing the failure

### Requirement: Download oracle cards with streaming
The system SHALL download the oracle_cards JSON file from the obtained URI. The download SHALL stream data rather than buffering the entire file in memory. The request SHALL include an explicit `User-Agent` header identifying the application as `scrycall` and an explicit `Accept` header.

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

### Requirement: Importer extracts layout field from Scryfall JSON
The importer SHALL extract the `layout` field from each Scryfall card object and store it in the `layout` column of the `cards` table. The `ScryfallCard` interface SHALL include an optional `layout` field.

#### Scenario: Card with layout field
- **WHEN** a card with `layout: "normal"` is imported
- **THEN** the `layout` column for that card contains "normal"

#### Scenario: Split card layout
- **WHEN** a card with `layout: "split"` is imported
- **THEN** the `layout` column for that card contains "split"

#### Scenario: Modal DFC layout
- **WHEN** a card with `layout: "modal_dfc"` is imported
- **THEN** the `layout` column for that card contains "modal_dfc"

### Requirement: Importer computes and inserts card tags
After inserting a card and its auxiliary data (colors, keywords, legalities), the importer SHALL call `tagCard(card)` from the tagger module and insert each returned tag into the `card_tags` table using a prepared statement.

#### Scenario: Card receives tags during import
- **WHEN** a card matching the fetchland criteria is imported
- **THEN** a row `(card_id, 'fetchland')` is inserted into `card_tags`

#### Scenario: Card receives multiple tags
- **WHEN** a legendary creature is imported
- **THEN** rows for both "commander" and "brawler" tags are inserted into `card_tags`

#### Scenario: Card receives no tags
- **WHEN** a vanilla common creature is imported
- **THEN** no rows are inserted into `card_tags` for that card

### Requirement: Importer clears card_tags on reimport
The importer SHALL delete all rows from `card_tags` at the start of the import transaction, alongside the existing DELETE statements for other auxiliary tables.

#### Scenario: Reimport replaces tags
- **WHEN** a reimport is performed
- **THEN** old `card_tags` rows are deleted and new tags are computed from the fresh data

### Requirement: INSERT card statement includes layout
The prepared INSERT statement for cards SHALL include the `layout` column.

#### Scenario: INSERT includes layout
- **WHEN** a card is inserted during import
- **THEN** the INSERT OR REPLACE statement includes the `layout` value

### Requirement: Extract and deduplicate set metadata during import
The importer SHALL extract set metadata (`released_at` and `set_type`) from each Scryfall card object and collect unique sets into a map. After all cards are batch-inserted, the importer SHALL populate the `sets` table by inserting each unique set (code, name, released_at, set_type) using `INSERT OR IGNORE` to handle duplicates gracefully.

#### Scenario: Set metadata extraction
- **WHEN** cards are imported from Scryfall oracle_cards JSON
- **THEN** set metadata (released_at, set_type) is captured from each card

#### Scenario: Deduplication
- **WHEN** 70,000 cards reference 551 unique sets
- **THEN** exactly 551 rows are inserted into the sets table (one per unique set code)

#### Scenario: Released date preservation
- **WHEN** a set has `released_at: "2021-04-23"`
- **THEN** the sets table stores the date string in the released_at column for that set

#### Scenario: Set type preservation
- **WHEN** a set has `set_type: "expansion"`
- **THEN** the sets table stores "expansion" in the set_type column for that set

#### Scenario: Reimport with INSERT OR IGNORE
- **WHEN** `scrycall import --force` is run on an existing database with a sets table
- **THEN** the sets table is updated without duplicate key errors (INSERT OR IGNORE handles it)

### Requirement: Import execution uses bounded-memory writes
The importer SHALL process parsed oracle_cards data in bounded batches and SHALL NOT retain the full parsed card collection in memory before database writes begin.

#### Scenario: Large import stays bounded by batch strategy
- **WHEN** the importer processes a bulk data stream containing 70,000 or more cards
- **THEN** memory usage scales with the configured batch size and supporting set metadata rather than the total number of parsed cards

#### Scenario: Bounded writes preserve atomic replacement
- **WHEN** an import fails after one or more write batches have been processed
- **THEN** the database still reflects either the pre-import data set or the fully completed new import, but not a partially replaced card corpus

### Requirement: Import process downloads oracle tags bulk file

The import system SHALL download Scryfall's Oracle Tags bulk file (oracle-tags-TIMESTAMP.jsonl) from the bulk data endpoint during each import run. The system SHALL decompress the gzipped file and parse JSONL format. If download or decompression fails, the system SHALL log a warning and continue with card import (oracle tags remain unavailable but cards are still imported).

#### Scenario: Oracle tags file is downloaded successfully
- **WHEN** the import process runs with network access to Scryfall API
- **THEN** the system downloads the oracle tags bulk file and processes it

#### Scenario: Oracle tags download failure is non-blocking
- **WHEN** the oracle tags bulk file is unavailable or download fails
- **THEN** the system logs a warning, continues with card import, and cards are available without oracle tags

### Requirement: Import process parses oracle tags JSON and builds DAG

The import system SHALL parse the Oracle Tags JSONL, extracting: tag_id (UUID), slug, label, parent_id, child_ids, description, aliases, and taggings array. The system SHALL build an in-memory Directed Acyclic Graph (DAG) using parent-child relationships. The system SHALL compute transitive closure for each tag (all reachable descendants) using depth-first traversal. The system SHALL handle cycles defensively: log warning if cycle detected, exclude cyclic edges, continue.

#### Scenario: DAG is built from parent-child relationships
- **WHEN** import parses 1,001 tags with parent_ids and child_ids
- **THEN** the system builds in-memory graph and computes all transitive closures

#### Scenario: Transitive closure computation includes all descendants
- **WHEN** tag "removal" has child "removal-burn", which has child "burn-creature"
- **THEN** transitive closure for "removal" includes both "removal-burn" and "burn-creature"

#### Scenario: Multi-parent tags are resolved via DAG traversal
- **WHEN** a tag has multiple parents (e.g., tag → parent_A and tag → parent_B)
- **THEN** the system traverses all parent paths and collects all unique descendants

#### Scenario: Cycles in DAG are detected and logged
- **WHEN** import detects a cycle (tag→parent→...→tag)
- **THEN** the system logs a warning message and excludes cyclic edges from transitive closure

### Requirement: Import process stores oracle tags and taggings in database

The import system SHALL insert or update records in `oracle_tags` table (tag_id, slug, label, parent_id, description, cached_descendants_json). For each tagging in the JSON, the system SHALL insert a record in `oracle_taggings` (oracle_id, tag_id, weight, annotation). The system SHALL batch inserts for performance. The system SHALL handle duplicates (e.g., same card tagged multiple times) by upserting.

#### Scenario: Oracle tags are inserted into database
- **WHEN** import processes 1,001 tags from bulk file
- **THEN** the system inserts or updates 1,001 rows in `oracle_tags` with cached descendants

#### Scenario: Taggings are batch inserted efficiently
- **WHEN** import processes ~500K taggings across all tags
- **THEN** the system batch inserts in chunks (e.g., 1000 rows per batch) for performance

#### Scenario: Duplicate taggings are handled
- **WHEN** the bulk file contains duplicate card-tag associations (same oracle_id, tag_id)
- **THEN** the system upserts the row, preferring the highest weight or latest annotation

### Requirement: Cached descendants JSON is populated during import

The import system SHALL compute cached_descendants_json (JSON array of all descendant tag IDs) for each tag and store in `oracle_tags.cached_descendants_json`. This precomputation ensures query-time performance. The cached JSON SHALL include all transitive descendants (not just direct children).

#### Scenario: Cached descendants are precomputed
- **WHEN** import completes DAG traversal for tag "removal"
- **THEN** the system stores cached_descendants_json as JSON array [removal_burn_id, removal_token_id, ...] in the database

#### Scenario: Leaf tags have themselves as singleton descendants
- **WHEN** import processes a leaf tag with no children
- **THEN** the system stores cached_descendants_json as [tag_id_itself]

### Requirement: Import integration with existing card import process

The oracle tags import SHALL be integrated as a separate step in the import pipeline, executed AFTER cards are imported but BEFORE the import process concludes. Oracle tag import failure SHALL not block the completion of card import. The system SHALL log import statistics (tags imported, taggings imported, time elapsed).

#### Scenario: Oracle tags import runs after cards
- **WHEN** the full import process runs
- **THEN** cards are imported first, then oracle tags are imported in sequence

#### Scenario: Import statistics are logged
- **WHEN** import completes
- **THEN** the system logs message: "Imported X oracle tags, Y taggings in Zms"

