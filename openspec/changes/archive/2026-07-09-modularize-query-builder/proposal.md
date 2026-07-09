## Why

Search semantics are concentrated in a single query-builder module that mixes condition dispatch, alias resolution, boolean composition, join allocation, and sort generation. That concentration makes even small query changes expensive to review and easy to regress, so the search engine needs an explicit requirement for modular, deterministic query compilation before more query work accumulates.

## What Changes

- Add a search-engine requirement that query compilation remain deterministic when condition builders, sort builders, and join allocation are split into internal modules
- Define the refactor boundary around the existing `buildQuery` API so callers continue to receive the same SQL behavior and sort semantics
- Require parity coverage for the current supported query surface during the modularization work

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `search-engine`: Add requirements for deterministic query compilation across modular builder components while preserving all existing query semantics and sort behavior

## Impact

- Affected code: `src/search/query-builder.ts`, `src/search/search.ts`, search-related tests
- Affected systems: search query compilation and query-builder test coverage
- Compatibility: no CLI syntax changes and no intended behavior changes for supported queries