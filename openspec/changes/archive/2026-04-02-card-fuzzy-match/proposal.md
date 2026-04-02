## Why

The `card` command requires users to type the exact full card name to get card details. With ~30K unique card names in the database, users frequently mistype names, forget exact wording, or don't want to type a long name. When the name doesn't match exactly, the command simply says "Card not found" with no help. A fuzzy/prefix fallback would make the command significantly more usable by suggesting matching cards when an exact match isn't found.

## What Changes

- When the `card` command finds no exact match, it falls back to a prefix/substring search against the cards table
- If exactly one card matches the fuzzy search, its detail is displayed automatically
- If multiple cards match, a numbered suggestion list is displayed (capped at a reasonable limit)
- If no cards match at all, the existing "Card not found" error is shown
- A new query function for fuzzy card name searching is added to the database layer

## Capabilities

### New Capabilities
- `card-name-search`: Fuzzy/prefix card name matching query logic that returns cards whose names contain or start with the given input

### Modified Capabilities
- `cli-commands`: The `card` command behavior changes to include a fallback search when no exact name match is found, displaying suggestions or auto-selecting a single match

## Impact

- `src/db/queries.ts` — New query function for prefix/substring card name search
- `src/cli/commands/card.ts` — Fallback logic when exact match fails
- `src/output/card-formatter.ts` — Numbered list formatting for suggestions
- No new dependencies
- No breaking changes (exact match behavior unchanged)
