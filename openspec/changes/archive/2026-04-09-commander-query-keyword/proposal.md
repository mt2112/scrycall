## Why

Users expect `commander:RG` to find cards legal in a red-green Commander deck (color identity subset of {R, G}), matching Scryfall syntax. Currently, `commander:` is not a recognized keyword, so the tokenizer treats `commander:RG` as a bare word and searches card names for the literal text "commander:RG", returning zero results.

## What Changes

- Add `commander` as a new `SearchField` variant in the query model
- Register `commander:` as a keyword prefix in the tokenizer
- Route `commander:` queries to the existing color identity subset logic (`id<=`) in the query builder
- The `:` operator on `commander` always means "identity is a subset of" (matching Scryfall semantics), unlike `id:` where `:` means "identity is a superset of"

## Capabilities

### New Capabilities

_None — this extends existing capabilities._

### Modified Capabilities

- `query-parser`: Add `commander:` as a recognized keyword prefix that maps to a new `commander` SearchField
- `search-engine`: Route `commander` field to color identity subset query (reuses existing `buildColorQuery` with `<=` operator)

## Impact

- `src/models/query.ts` — add `'commander'` to `SearchField` union
- `src/parser/tokenizer.ts` — add `'commander': 'commander'` to `KEYWORD_MAP`
- `src/search/query-builder.ts` — add `commander` case in `buildComparisonSql`
- Tests for parser and search engine need new cases
