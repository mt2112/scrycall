## Why

Scryfall's community-maintained Oracle Tags provide functional categorizations (removal, ramp, draw, evasion, tutors, etc.) that are not currently available in scrycall. These tags represent collective knowledge about card roles and synergies, enabling more expressive queries than auto-computed tags alone. Adding support for oracle tags allows users to search by functional category — e.g., `otag:ramp`, `otag:removal` — unlocking queries that match community expertise about card function across Magic's history.

## What Changes

- **Import Pipeline**: Add daily download and parsing of Scryfall's Oracle Tags bulk file. Build transitive closure for hierarchical tags (DAG structure with up to 1,001 tags). Store in `oracle_tags` and `oracle_taggings` tables.
- **Query System**: Extend tokenizer to recognize `otag:` keyword. Add hierarchy-aware query builder that expands parent tags to descendants. Support weight filtering (strong+, weak, etc.).
- **Operator Behavior**: `otag:ramp` finds cards tagged with ramp or any descendant (e.g., mana-ramp, acceleration). Supports negation (`otag!=ramp`) and logical operators like existing tags.
- **Database Schema**: Add `oracle_tags` (tag registry with cached descendants) and `oracle_taggings` (card-to-tag associations with weights). Estimated ~100-150 MB total storage.

## Capabilities

### New Capabilities
- `oracle-tags`: Support for Scryfall community oracle tags with hierarchical traversal (DAG-based), weight filtering, and otag: query operator for functional card search.

### Modified Capabilities
- `query-parser`: Extend tokenizer to recognize `otag:` as a keyword operator alongside existing `o:`, `t:`, `is:`, etc.
- `search-engine`: Implement oracle tag hierarchy expansion and SQL query builder for tag-based filtering.
- `data-import`: Add oracle tags bulk file download, parsing, DAG traversal, and transitive closure computation during import.

## Impact

- **Database**: Two new tables (`oracle_tags`, `oracle_taggings`), ~100-150 MB additional storage.
- **Import Performance**: Daily import gains ~100-150ms for oracle tags processing (DAG closure computation).
- **Query Parser**: New keyword operator; no breaking changes to existing syntax.
- **Search Performance**: Queries with `otag:` expand to descendants at query time (~1-5ms after cache load). No impact on existing queries.
- **User-Facing**: Users gain access to ~1,001 community tags enabling functional category searches. No breaking changes.
