## Context

The `card` command currently does a single exact-match query (`WHERE name = ? COLLATE NOCASE`) via `getCardByName` in `src/db/queries.ts`. When no match is found, it prints "Card not found" and exits. There is no fallback search.

The database already has an FTS5 index on card names (via `cards_fts`), and `LIKE` queries with `COLLATE NOCASE` are available for prefix/substring matching. The `cards` table contains ~30K rows with unique oracle card names.

## Goals / Non-Goals

**Goals:**
- Provide helpful suggestions when the user's input doesn't exactly match a card name
- Auto-select and display detail when exactly one card matches
- Keep the query fast — users expect instant response from a local SQLite database

**Non-Goals:**
- No typo correction or edit-distance matching (e.g., Levenshtein) — prefix/substring is sufficient for now
- No shell-level tab completion
- No interactive prompt loop (that's a separate future change)
- No changes to the `search` command

## Decisions

### 1. Two-tier fallback: prefix first, then substring

**Decision**: When exact match fails, try `WHERE name LIKE '<input>%'` (prefix). If that returns nothing, try `WHERE name LIKE '%<input>%'` (substring/contains).

**Rationale**: Prefix matches are more likely what the user intended ("Light" → "Lightning Bolt") and are faster (can use index). Substring catches cases like "Bolt" → "Lightning Bolt" but is broader and slower. Trying prefix first keeps the common case fast and relevant.

**Alternatives considered**:
- *FTS5 MATCH*: Good for multi-word searches but overly complex for name completion. FTS tokenizes and matches differently than users expect for autocomplete.
- *Single LIKE '%input%'*: Simpler but returns less relevant results first (a card with "Bolt" in the middle ranks the same as one starting with "Bolt").

### 2. Result cap of 10 suggestions

**Decision**: Limit fuzzy results to 10 cards. If more exist, show the count of remaining matches.

**Rationale**: MTG has many cards sharing name prefixes (e.g., "Lightning" matches 15+ cards). Showing all of them creates noise. 10 is enough to find what you want. The total count tells users to be more specific if needed.

### 3. Auto-select on single match

**Decision**: If exactly one card matches the fuzzy search, display its full detail directly (same as an exact match) instead of showing a 1-item list.

**Rationale**: If the user typed "Lightning Bo" and only "Lightning Bolt" matches, making them re-run with the full name is pointless friction. The intent is clear.

### 4. Numbered suggestions use existing formatter

**Decision**: Add a `formatNumberedCardList` function alongside the existing `formatCardList` in `card-formatter.ts`. The numbered list is only used for `card` command suggestions, not for `search` output (yet).

**Rationale**: The `search` command's output format is a separate concern. Adding indices to search output would be part of the interactive search change.

### 5. LIKE queries use COLLATE NOCASE

**Decision**: All fuzzy queries use `COLLATE NOCASE` for case-insensitive matching, consistent with the existing exact match behavior.

**Rationale**: Users shouldn't need to match capitalization. "lightning bolt", "Lightning Bolt", and "LIGHTNING BOLT" should all work.

## Risks / Trade-offs

- **Substring matches can be noisy** — Searching for "an" would match hundreds of cards. The 10-result cap mitigates this, and showing "N more results" tells users to refine. → Mitigation: cap + message.
- **LIKE '%input%' can't use SQLite indices** — Full substring scans the entire `name` column. With ~30K rows this is still sub-millisecond on any modern machine for a simple string column. → Mitigation: acceptable perf for local SQLite.
- **User might expect the numbered list to be selectable** — e.g., typing `scry card 3` after seeing suggestions. This is not supported in this change but is a natural extension. → Mitigation: this is deferred to the interactive search change.
