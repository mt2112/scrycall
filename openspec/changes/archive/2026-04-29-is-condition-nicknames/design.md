## Context

ScryCall's `is:` conditions are implemented as a `Record<string, () => SqlQuery>` dict (`IS_CONDITIONS`) in `src/search/query-builder.ts`. There are 10 conditions (spell, permanent, historic, vanilla, modal, bear, hybrid, phyrexian, party, outlaw) plus 2 `has:` conditions (pt, loyalty). The `buildIsQuery` function looks up the dict and returns `1 = 0` for unknown conditions.

The Scryfall bulk JSON includes a `layout` field (split, flip, transform, modal_dfc, meld, leveler, etc.) that is not currently imported. The `ScryfallCard` interface in `src/import/importer.ts` omits it.

The importer runs within a single transaction: DELETE all → INSERT cards → INSERT colors/identity/keywords/legalities → rebuild FTS5. Adding tag computation and insertion fits naturally into this loop.

Land cycle nicknames require oracle-text heuristics that are complex to express as SQL LIKE patterns (multiple patterns per condition, some needing regex-like logic). Commander conditions need type-line + keyword checks across multiple tables.

## Goals / Non-Goals

**Goals:**
- Add `layout` column to cards table, import from Scryfall bulk data
- Implement a `card_tags` pre-tagging system for derived `is:` conditions
- Add ~35 new `is:` conditions: land nicknames, commander/format, multi-face
- Support aliases (e.g., `is:cycleland` → `is:bikeland`)
- Keep existing runtime `IS_CONDITIONS` intact for simple conditions
- Make the system extensible — adding a new tag = one function in tagger.ts

**Non-Goals:**
- Moving existing `IS_CONDITIONS` (spell, permanent, etc.) to pre-tagging — they work fine as runtime SQL
- Importing additional Scryfall fields beyond `layout` (reserved, artist, flavor_text, etc. are separate changes)
- Price-based conditions (usd, eur, tix)
- Tagger tags (art:, function:) — requires Tagger API
- `has:indicator` — requires `color_indicator` column (separate change)

## Decisions

### 1. Pre-tagging via `card_tags` table for complex conditions

**Decision:** Land nicknames and commander conditions are computed at import time by JavaScript predicate functions and stored in a `card_tags (card_id TEXT, tag TEXT)` join table. At query time, `buildIsQuery` falls through to an EXISTS subquery against this table for conditions not in the hardcoded dict.

**Rationale:** Oracle-text heuristics for land cycles involve multiple LIKE patterns per condition, some requiring AND/OR combinations. Expressing these in SQL is fragile and slow (runtime LIKE scanning on every query). JavaScript predicates are more expressive (regex, multi-field logic, layout checks) and execute once at import time. The indexed tag lookup is O(log n) at query time.

**Alternative considered:** All conditions as runtime SQL in `IS_CONDITIONS` dict. Rejected because ~35 new conditions with complex oracle patterns would bloat query-builder.ts by ~300+ lines of SQL LIKE patterns, and query performance would degrade with multiple LIKE scans.

**Alternative considered:** Condition definitions stored as table data (SQL patterns in a DB table). Rejected because it creates a meta-language for expressing conditions, loses TypeScript type checking, and doesn't simplify anything — the pattern-matching logic still needs to exist somewhere.

### 2. Layout-based conditions stay in the hardcoded dict

**Decision:** Multi-face conditions (`is:split`, `is:dfc`, `is:mdfc`, `is:transform`, `is:flip`, `is:meld`, `is:leveler`) are added to the `IS_CONDITIONS` dict as simple column equality checks against `cards.layout`, not as pre-computed tags.

**Rationale:** These are trivial SQL (`cards.layout = 'split'`). Pre-tagging would add import overhead and indirection for no benefit. The hardcoded dict is the right tool for simple column checks.

### 3. Alias resolution at query time via static map

**Decision:** A `TAG_ALIASES: Record<string, string>` map resolves alternate names to canonical tag names before the tag table lookup. Aliases are not stored as separate rows in `card_tags`.

**Rationale:** Keeps the table lean (~30 canonical tags vs. ~50+ if aliases were duplicated). Alias resolution is a trivial object lookup. The map is co-located with `buildIsQuery` for discoverability.

**Alias map:**
| Alias | Canonical |
|-------|-----------|
| cycleland, bicycleland | bikeland |
| karoo | bounceland |
| snarl | shadowland |
| battleland | tangoland |
| trikeland, tricycleland | triome |
| canland | canopyland |
| crowdland, bbdland, battlebondland | bondland |
| creatureland | manland |
| tdfc | transform |

### 4. Tagger module as pure functions

**Decision:** `src/import/tagger.ts` exports a `TAG_RULES: Record<string, (card: ScryfallCard) => boolean>` and a `tagCard(card: ScryfallCard): string[]` function. Each rule is a pure function that inspects the raw Scryfall card object and returns boolean.

**Rationale:** Pure functions are trivially testable — create a mock card object, assert the return. No database needed. The tagger module has zero dependencies beyond the `ScryfallCard` type.

### 5. Importer calls tagger after card insertion

**Decision:** In the import transaction loop, after inserting a card and its colors/keywords/legalities, call `tagCard(card)` and INSERT each returned tag into `card_tags`. A prepared statement `INSERT OR IGNORE INTO card_tags (card_id, tag) VALUES (?, ?)` handles this.

**Rationale:** Tags are derived from the same card data being imported — computing them inline avoids a second pass. The transaction wraps everything atomically.

### 6. `buildIsQuery` fallthrough strategy

**Decision:** Modify `buildIsQuery` to: (1) resolve aliases, (2) check `IS_CONDITIONS` dict, (3) fall through to `card_tags` EXISTS query. Unknown tags naturally return zero rows from the table.

```
buildIsQuery(value):
  lower = value.toLowerCase()
  canonical = TAG_ALIASES[lower] ?? lower
  if IS_CONDITIONS[canonical] exists → return it
  return EXISTS (SELECT 1 FROM card_tags WHERE card_id = cards.id AND tag = ?)
```

**Rationale:** Existing runtime conditions are unaffected. The fallthrough means adding a new tag requires zero query-builder changes — just add a rule to tagger.ts and re-import.

### 7. Land nickname tag rules — oracle-text heuristics

**Decision:** Each land nickname is matched by oracle text and/or type line patterns. Specific strategies per cycle:

| Tag | Strategy |
|-----|----------|
| dual | Hardcoded list of 10 card names (Tundra, Underground Sea, etc.) |
| fetchland | Land + oracle includes "Search your library for" + "pay 1 life" + "put it onto the battlefield" |
| shockland | Type line has two basic land types + oracle includes "pay 2 life" |
| checkland | Land + oracle includes "unless you control a" + basic land type reference |
| fastland | Land + oracle includes "two or fewer other lands" |
| slowland | Land + oracle includes "two or more other lands" |
| painland | Land + oracle includes "deals 1 damage to you" + "{C}" |
| gainland | Land + oracle includes "enters tapped" + "gain 1 life" |
| scryland | Land + oracle includes "enters tapped" + "scry 1" |
| bounceland | Land + oracle includes "return a land" + "enters tapped" |
| bikeland | Type line has two basic land types + "Cycling" in keywords |
| triome | Type line has three basic land types + "Cycling" in keywords |
| tangoland | Type line has two basic land types + oracle includes "two or more basic lands" |
| bondland | Land + oracle includes "two or more opponents" |
| canopyland | Land + oracle includes "sacrifice" + "draw a card" + "pay 1 life" |
| shadowland | Land + oracle includes "unless" + "reveal" + basic land type |
| filterland | Land + oracle includes "{1}, {T}: Add" |
| storageland | Land + oracle includes "storage counter" |
| surveilland | Land + oracle includes "enters tapped" + "surveil 1" |
| manland | Land + oracle matches "becomes a" + creature |
| pathway | layout = modal_dfc + type line includes "Land" on both sides (name contains " // ") |

**Rationale:** Oracle text heuristics work well for formulaic land cycles. The Scryfall bulk data uses current Oracle wording, so patterns should use modern templates (e.g., "enters tapped" not "enters the battlefield tapped").

### 8. Commander/format tag rules

| Tag | Strategy |
|-----|----------|
| commander | (type line includes "Legendary" AND (includes "Creature" OR "Planeswalker")) OR oracle includes "can be your commander" |
| partner | "Partner" in keywords array |
| companion | oracle includes "Companion —" |
| brawler | type line includes "Legendary" AND (includes "Creature" OR "Planeswalker") — same as commander minus the "can be your commander" text check |
| oathbreaker | type line includes "Planeswalker" |

## Risks / Trade-offs

- **[Tag staleness]** Tags are computed at import time. If tag logic changes, users must re-import. Mitigation: `scry import` already replaces all data — reimport naturally recomputes tags. Tag logic changes are rare.
- **[Oracle text wording changes]** WotC occasionally updates Oracle text templates (e.g., "enters the battlefield tapped" → "enters tapped"). Mitigation: Use modern wording patterns. The bulk data always has current Oracle text.
- **[Import performance]** ~35 tag rules × ~30K cards = ~1M evaluations at import time. Mitigation: Each evaluation is microsecond-scale string operations. Expected overhead: 50-200ms, negligible compared to JSON parsing and SQLite writes.
- **[DB size increase]** ~5 tags per card average × ~30K cards ≈ 150K rows, ~10-15MB. Mitigation: Acceptable for a CLI tool. The base DB is ~160MB.
- **[Heuristic accuracy]** Oracle-text patterns may have edge cases (false positives/negatives for unusual cards). Mitigation: The patterns are designed around well-known, formulaic cycles. Edge cases are rare and can be fixed by refining the predicate function.
