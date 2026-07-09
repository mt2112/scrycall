## Context

Scryfall's oracle tags are organized as a Directed Acyclic Graph (1,001 tags total, up to 5 levels deep, with 137 organizational root tags and 864 leaf tags with direct card taggings). Current scrycall supports only auto-computed tags (`is:` operator) for land cycles and commander properties. Oracle tags represent community-curated functional roles (removal, ramp, draw, evasion, tutors, etc.) that require hierarchical traversal: parent queries must find all descendants. The existing query system is extensible (modular query builders per operator), making oracle tag integration a natural fit.

**Bulk Data Format**: Daily ~17.2 MB Oracle Tags JSONL file from Scryfall. Each tag has parent_ids (multi-parent support), child_ids, and taggings array with oracle_id + weight (very_strong/strong/median/weak).

**Key Constraint**: DAG structure (multi-parent) complicates traversal compared to pure trees. Must handle transitive closure correctly for hierarchy expansion.

## Goals / Non-Goals

**Goals:**
- Enable functional card searches via `otag:` operator (e.g., `otag:ramp`, `otag:removal`)
- Support hierarchical queries: parent tag returns all descendants
- Preserve tagging weights for result relevance
- Maintain query performance: <5ms per query after cache load
- Support weight filtering: `otag:ramp!weak` to exclude weak matches
- No breaking changes to existing query syntax

**Non-Goals:**
- Art tags (illustration categories) — oracle tags only
- Tag management UI (CRUD operations on community tags) — read-only from Scryfall
- Real-time tag updates (daily bulk import suffices)
- Custom user-created tags (beyond Scryfall's community tags)

## Decisions

### Decision 1: Option C (Hybrid Cache) Over Flatten or Query-Time Traversal

| Option | Query Perf | Storage | Cache Cost | Chosen |
|--------|-----------|---------|-----------|--------|
| A: Flatten | 1ms | 150 MB | No | ❌ |
| B: Hierarchy | 50-500ms | 80 MB | Yes | ❌ |
| C: Hybrid Cache | 1-5ms | 100-150 MB | Yes | ✅ |

**Rationale**: Hybrid cache provides acceptable performance (1-5ms) without requiring denormalization that would break DAG relationships. Cache is rebuilt daily during normal import, so update cost is nil.

**Implementation**: Pre-compute transitive closure (all descendants) for each tag during import. Store descendants as JSON array in `oracle_tags.cached_descendants_json`. At query time, load cache and expand `otag:ramp` to [ramp_id, mana_ramp_id, acceleration_id, ...] then query `oracle_taggings` table.

### Decision 2: DAG Traversal with Topological Sort for Transitive Closure

**Rationale**: Scryfall's tags support multi-parent relationships (some tags have 2+ parents). Cannot use simple tree traversal. Must compute transitive closure (all reachable ancestors) for each tag.

**Algorithm**:
1. Load all 1,001 tags, build in-memory graph (parent_id → [children])
2. For each tag, perform depth-first traversal to collect all descendant leaf tags
3. Store as JSON: `[leaf_id_1, leaf_id_2, ...]`
4. Detect cycles (defensive): Log warning if found, exclude cyclic paths

**Why not direct traversal at query time**: Tree walks per query would be slow (50-500ms). Precomputing once per import is cheaper.

### Decision 3: Separate Weight Storage (No Aggregation)

**Rationale**: Oracle tags include weight per card-tag link. When querying `otag:evasion` (parent), we want to preserve individual weights from leaf tags (flying, unblockable, shroud) rather than aggregating them. This preserves specificity: results show "card is strong at flying, median at unblockable".

**Storage**: `oracle_taggings` table stores (oracle_id, tag_id, weight, annotation). No synthetic aggregation.

**Weight Filtering**: Default filter is strong+ (exclude weak). User can override with explicit syntax (e.g., `otag:ramp!weak` or future `otag:ramp!median`).

### Decision 4: Two-Table Schema

**Schema**:
```sql
CREATE TABLE oracle_tags (
  tag_id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  label TEXT,
  parent_id TEXT REFERENCES oracle_tags(tag_id),  -- single parent for hierarchy
  description TEXT,
  cached_descendants_json TEXT  -- JSON array of all descendant leaf tag IDs
);

CREATE TABLE oracle_taggings (
  id INTEGER PRIMARY KEY,
  oracle_id TEXT,
  tag_id TEXT REFERENCES oracle_tags(tag_id),
  weight TEXT CHECK(weight IN ('very_strong', 'strong', 'median', 'weak')),
  annotation TEXT,
  UNIQUE(oracle_id, tag_id)
);

CREATE INDEX idx_oracle_taggings_oracle_id ON oracle_taggings(oracle_id);
CREATE INDEX idx_oracle_taggings_tag_id ON oracle_taggings(tag_id);
```

**Rationale**: Separation of concerns (tags ≠ taggings) mirrors existing card_tags structure. Denormalization of descendants into JSON avoids recursive queries at runtime.

### Decision 5: Integration Point — Existing Import Pipeline

**Where**: Extend `src/import/importer.ts` to download oracle tags bulk file after card import.

**Sequence**:
1. Download oracle tags JSONL from Scryfall bulk data endpoint
2. Parse tags, build DAG, compute transitive closure
3. Batch insert oracle_tags + oracle_taggings

**Failure Handling**: Oracle tag import failure does not block card import. Log warning and continue. Users can query with `is:` (existing tags) even if oracle tags fail.

## Risks / Trade-offs

**[Risk] DAG Complexity**: Transitive closure computation could encounter cycles (unlikely but possible in community data). **Mitigation**: Implement cycle detection at import. If cycles found, log warning, skip cyclic edges, continue.

**[Risk] Storage Growth**: ~100-150 MB added to database. **Mitigation**: Acceptable for modern systems; monitor if future tag growth becomes problematic. Can prune old tags if needed.

**[Risk] Import Overhead**: Daily transitive closure computation adds ~100-150ms. **Mitigation**: Acceptable within daily import window. Negligible compared to card download time.

**[Trade-off] Query Expansion Cost**: Expanding `otag:evasion` to 50+ descendants costs ~1-2ms. Acceptable for CLI tool. **Mitigation**: Cache descendants in memory per session if future performance issues arise.

**[Risk] Tag Slug Stability**: Scryfall notes tag slugs may change over time. **Mitigation**: Store by tag_id (UUID), not slug. Document that users should reference slugs in queries (which resolve to IDs at query time).

**[Risk] Incomplete Tag Coverage**: Not all cards are tagged. **Mitigation**: Expected and acceptable. Empty results for niche queries are fine.

## Migration Plan

**Deployment**:
1. Create oracle_tags + oracle_taggings tables (migration file)
2. Extend importer to download + parse oracle tags on next run
3. Query builder: add `otag` keyword + builder function
4. Tokenizer: add `otag` to keyword map
5. Release with feature flag or documentation note

**Rollback**: Remove oracle_tags + oracle_taggings tables. Tokenizer fallback: unknown keywords are treated as text search, so queries still work (not ideal but safe).

**Testing**: Unit tests for DAG traversal, integration test with real oracle tags sample, performance test on full 1,001 tags.

## Open Questions

1. **Weight Filter Syntax**: Should `otag:ramp!weak` be supported, or only strong+ by default? Consider operator vs. modifier.
2. **Partial Tag Slugs**: Support `otag:removal*` for prefix search (e.g., find all removal-* tags)? Out of scope for MVP.
3. **Performance at Scale**: What's acceptable query latency on slower systems? 1-5ms assumed; measure on target hardware.
