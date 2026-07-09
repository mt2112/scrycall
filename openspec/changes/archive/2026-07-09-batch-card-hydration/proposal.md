## Why

Card reads currently hydrate colors, identities, keywords, and legalities through per-card follow-up queries, which turns larger result sets into repetitive database work. The database layer needs an explicit requirement for set-based hydration so performance improvements can land without changing the public Card shape used across the CLI.

## What Changes

- Add a database requirement that card query helpers hydrate auxiliary card data through set-based loading rather than per-card lookups
- Preserve the existing `Card` return shape and query helper entry points while changing the internal hydration strategy
- Add verification requirements for larger result sets so the read-path refactor is measured against realistic usage

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `database`: Add requirements for set-based card hydration and stable typed `Card` mapping for multi-row result sets

## Impact

- Affected code: `src/db/queries.ts`, search/detail lookups, DB-focused tests
- Affected systems: search result hydration and card detail reads
- Compatibility: no schema changes and no intended changes to returned card fields