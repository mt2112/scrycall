## ADDED Requirements

### Requirement: Oracle tags are imported from Scryfall bulk data daily

The system SHALL download and parse Scryfall's Oracle Tags bulk file (oracle-tags-TIMESTAMP.jsonl) daily as part of the import process. The system SHALL extract tag metadata (id, slug, label, parent_id, child_ids, description, aliases) and build a Directed Acyclic Graph (DAG) to compute transitive closure of descendants for each tag. The system SHALL store tags and their taggings (card-oracle_id associations with weights) in the database for query execution.

#### Scenario: Oracle tags imported on successful download
- **WHEN** the import process runs and Scryfall's oracle tags bulk file is downloaded
- **THEN** the system parses the JSONL file, computes transitive descendants for each tag, and stores all tags in `oracle_tags` table with cached descendants

#### Scenario: Oracle tags import failure does not block card import
- **WHEN** the oracle tags bulk file download or parsing fails
- **THEN** the system logs a warning and continues with card import; oracle tags remain unavailable

### Requirement: Oracle tags support DAG hierarchy with transitive closure

The system SHALL support multi-parent tag relationships (Directed Acyclic Graph). For each tag, the system SHALL compute transitive closure (all reachable descendant leaf tags) and store as JSON in `oracle_tags.cached_descendants_json`. The system SHALL detect and handle cycles defensively (log warning, exclude cyclic paths).

#### Scenario: Parent tag expands to all descendants
- **WHEN** a tag has children (e.g., removal → removal-burn, removal-token, removal-toughness)
- **THEN** the system computes descendants [removal-burn, removal-token, removal-toughness, ...] and stores in cached_descendants_json

#### Scenario: Multi-parent tags are resolved correctly
- **WHEN** a tag has multiple parents (e.g., a tag linked to both parent-A and parent-B)
- **THEN** the system ensures transitive closure includes all descendants from all parents without duplication

#### Scenario: Cycles are detected and logged
- **WHEN** a cycle is detected in the DAG (tag→parent→...→tag)
- **THEN** the system logs a warning, skips cyclic edges, and continues with valid descendants

### Requirement: Oracle taggings preserve card-to-tag weight

The system SHALL store each card-to-tag association (tagging) with its weight (very_strong, strong, median, weak) in the `oracle_taggings` table. The system SHALL NOT aggregate or modify weights during hierarchy traversal; each tagging retains its original weight.

#### Scenario: Weight is preserved for direct tagging
- **WHEN** a card is tagged as "very_strong" for a specific tag
- **THEN** the system stores weight="very_strong" in oracle_taggings and does not modify it

#### Scenario: Multiple taggings for same card are stored separately
- **WHEN** a card is tagged with both "flying" (strong) and "shroud" (median)
- **THEN** the system stores two rows in oracle_taggings, one for each tag, with original weights intact

### Requirement: Oracle tags database schema

The system SHALL implement two new tables:
- `oracle_tags(tag_id, slug, label, parent_id, description, cached_descendants_json)`: Tag registry with precomputed descendants
- `oracle_taggings(id, oracle_id, tag_id, weight, annotation)`: Card-to-tag associations with weights

The system SHALL create indexes on `oracle_taggings.oracle_id` and `oracle_taggings.tag_id` for query performance.

#### Scenario: Oracle tags table structure supports queries
- **WHEN** the database is queried for a tag's descendants
- **THEN** the system retrieves tag from `oracle_tags`, parses `cached_descendants_json`, and uses the list to query `oracle_taggings`

#### Scenario: Taggings are efficiently indexed
- **WHEN** a search is performed for cards with a specific tag
- **THEN** the system uses indexes on oracle_id and tag_id to retrieve results in <5ms
