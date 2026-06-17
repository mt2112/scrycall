## Context

Currently, sets are denormalized into the `cards` table (only `set_code` and `set_name` columns). The Scryfall oracle_cards bulk data includes `released_at` and `set_type` fields for each card, but these are not extracted or deduplicated. Users have no dedicated way to search sets—only a static sets.md reference file.

The proposal aims to add a `sets` search command that lets users discover sets by multiple criteria (name, code, year, set type) with smart filtering to hide noisy set types.

## Goals / Non-Goals

**Goals:**
- Enable users to search MTG sets efficiently using name, code, year, and type as search criteria
- Extract and store set metadata that is already available in Scryfall bulk data
- Provide a discoverable CLI interface that follows existing scrycall command patterns
- Hide noisy set types (tokens, promos, memorabilia) by default while allowing access via `--all` flag

**Non-Goals:**
- Add set block/block-code support (pre-2015 only, minimal value)
- Derive card count per set during search (can be added later with a JOIN if needed)
- Call a separate Scryfall Sets API (unnecessary—data is in bulk cards download)
- Support set legality/format-specific filtering (belongs to card search, not set search)

## Decisions

### Decision 1: Dedicated `sets` table vs. querying `cards` table directly

**Choice**: Create a dedicated `sets` table.

**Rationale**:
- **Data deduplication**: Each set appears ~20-100 times in the cards table. A dedicated table stores each set once.
- **Query efficiency**: Searching 551 sets is fast; avoiding a DISTINCT+GROUP BY operation on 70k+ cards is cleaner.
- **Future extensibility**: Set metadata can grow (block code, icons, etc.) without bloating the cards table.
- **Consistent schema**: Follows the existing relational patterns (colors, keywords, legalities tables).

**Alternatives considered**:
- Query cards table: `SELECT DISTINCT set_code, set_name FROM cards WHERE name LIKE ?`. Avoids migration but slower and harder to extend.
- Use a view: `CREATE VIEW sets AS SELECT DISTINCT set_code, set_name FROM cards`. Querying is the same, but still requires extracting released_at/set_type.

### Decision 2: When and how to populate the sets table

**Choice**: Populate during `scrycall import` by streaming Scryfall card data.

**Rationale**:
- Scryfall's oracle_cards JSON already contains per-card set metadata (`released_at`, `set_type`).
- Cost is minimal: collect unique sets in a `Map<code, metadata>` while streaming cards, then INSERT OR IGNORE after card batch inserts.
- Single-pass processing avoids a second API call or separate data source.
- Atomic with card import: sets and cards stay in sync.

**Alternatives considered**:
- Call a separate Scryfall Sets API: extra network request, not needed since data is already in bulk download.
- Store only set_code and set_name initially, load full metadata later: adds complexity for minimal gain.

### Decision 3: Search term dispatch (smart vs. explicit flags)

**Choice**: Smart positional argument with optional flags.

**Logic**:
- 4 consecutive digits → treat as year filter
- ≤5 non-numeric characters → try exact set code match first, then fall back to name LIKE
- Longer strings → treat as name LIKE

**Rationale**:
- Matches user expectations: `scrycall sets 2021` feels natural for year, `scrycall sets stx` for code, `scrycall sets strixhaven` for name.
- Less verbose than explicit flags for common cases: `scrycall sets strixhaven` beats `scrycall sets --name strixhaven`.
- Flags available for precision: `scrycall sets afr --year 2021` narrows ambiguous matches.

**Alternatives considered**:
- Require explicit flags: `scrycall sets --name strixhaven`. Unambiguous but verbose; most users expect positional args.
- No smart dispatch, always treat positional as name: loses the ergonomic appeal of year searches.

### Decision 4: Filtering noisy set types

**Choice**: Default-hide `token`, `memorabilia`, `minigame`, `predraft`, `treasure_chest`, `vanguard`. `--all` flag overrides.

**Rationale**:
- These types are rarely what users search for; they clutter results.
- Example: `scrycall sets strixhaven` should find STX, STA, C21 (the user probably cares about), not 20+ promo/token variants.
- `--all` is discoverable via help and lets power users access everything.

**Alternatives considered**:
- Show everything by default, require `--hide-promos` flag: most users would have to learn a flag to avoid noise.
- Curate a "main-sets" category: overkill complexity; a simple type filter is cleaner.

### Decision 5: Output format

**Choice**: Columnar output with columns: CODE, NAME, YEAR, TYPE.

**Format**:
```
STX  Strixhaven: School of Mages        2021  expansion
STA  Strixhaven Mystical Archive         2021  masterpiece
C21  Commander 2021                      2021  commander
```

**Rationale**:
- Consistent with existing scrycall output style (see card-formatter.ts).
- CODE and YEAR are frequently referenced, worth displaying.
- TYPE is noisy but useful context when visible.
- Columnar layout is more readable than JSON or comma-separated for large result sets.

**Alternatives considered**:
- Plain list (code + name only): loses type info, year requires parsing the name.
- JSON output: not aligned with existing CLI output format.

## Risks / Trade-offs

### Risk: Database not up-to-date if user hasn't imported yet
- **Severity**: Low
- **Mitigation**: Command output checks if sets table is empty and suggests `scrycall import`. Graceful degradation.

### Risk: Year extraction relies on released_at field being present
- **Severity**: Low
- **Mitigation**: Scryfall's oracle_cards has released_at for all cards; if missing, NULL is acceptable in the database and renders as blank in results.

### Risk: Type filtering is opinionated and could hide user's desired results
- **Severity**: Very Low
- **Mitigation**: `--all` flag provides immediate override. Help text mentions it.

### Trade-off: No set block support
- **Severity**: Low (only affects ~20 pre-2015 sets)
- **Mitigation**: Can be added in a follow-up if demand emerges. Not critical for initial MVP.

### Trade-off: No card count per set (for now)
- **Severity**: Low (nice-to-have, not a core requirement)
- **Mitigation**: Can be added later with a LEFT JOIN if needed; deferred to avoid query complexity.

## Migration Plan

1. Create migration 004-add-sets-table.sql in src/db/migrations/
2. Register migration in src/db/migrations.ts
3. Update importer.ts to extract set metadata
4. Create query function searchSets() in src/db/queries.ts
5. Create CLI command src/cli/commands/sets.ts
6. Register command in src/cli/index.ts
7. Add tests: tests/cli/sets.test.ts, tests/db/sets-queries.test.ts

Deployment: No breaking changes. Existing users who run `scrycall import` will populate the sets table. Users who don't import will see an empty results message (graceful).

Rollback: Drop migration 004 and remove sets command registration. Existing databases can leave the sets table; it won't interfere.

## Open Questions

None. Decision rationale is complete and risk assessment is clear.
