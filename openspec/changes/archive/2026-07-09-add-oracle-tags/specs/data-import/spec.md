## ADDED Requirements

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
