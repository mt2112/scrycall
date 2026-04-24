## Why

Search results currently display in arbitrary database insertion order, making large result sets difficult to scan and use effectively. A query like `c:red t:creature f:modern` returns hundreds of cards with no way to organize them by name, mana cost, power, or rarity. Sorting is fundamental CLI UX — Scryfall supports `order:` and `direction:` keywords, and ScryCall should too.

## What Changes

- Add `order:` query keyword supporting sort fields: `name`, `cmc` (alias `mv`), `power` (alias `pow`), `toughness` (alias `tou`), `rarity`, `color`, `set`
- Add `direction:` query keyword supporting `asc` and `desc` values
- Default sort order is `name asc` when no `order:` is specified
- `order:` and `direction:` are meta-keywords that affect result ordering, not card filtering — they do not produce WHERE clauses
- Multiple `order:` keywords in a single query use the last one (no multi-column sort)
- The tokenizer, parser, query builder, and search orchestrator all need updates to propagate sort information

## Capabilities

### New Capabilities
- `result-sorting`: Query keywords `order:` and `direction:` for controlling search result sort order, including default sort behavior

### Modified Capabilities
- `query-parser`: Tokenizer and parser must recognize `order:` and `direction:` as meta-keywords and produce sort metadata separate from the filter AST
- `search-engine`: Query builder must translate sort metadata into SQL ORDER BY clauses; search orchestrator must thread sort info from parser to database
- `cli-commands`: Search command must pass sort options through to the search layer

## Impact

- **Parser**: Tokenizer adds `order` and `direction` keyword recognition; parser extracts sort metadata alongside the filter AST
- **Models**: Query types need a sort options structure
- **Search**: Query builder appends ORDER BY clause; search function signature may gain sort parameter
- **CLI**: No new flags needed — sorting is specified in the query string itself
- **Tests**: Parser, query builder, and search tests need sort-related cases
