## Why

Scrycall's query syntax currently supports 13 fields and basic boolean logic, but comparison with Scryfall.com reveals several commonly-used features that are missing despite requiring no schema or import changes. These "quick wins" — 11 features in total — close meaningful gaps using only data already in the database, improving query expressiveness with minimal implementation risk.

## What Changes

- **Fix `and` keyword**: Tokenizer currently treats `and` as a bare word text search, breaking queries like `(t:elf and t:cleric)`. Fix by skipping `and` since AND is implicit.
- **Add `e:`/`edition:` set aliases**: Scryfall supports `e:` and `edition:` as aliases for `s:`/`set:`. Add to tokenizer keyword map.
- **Add four-color aliases**: Add `chaos`, `aggression`, `altruism`, `growth`, `artifice` to color alias map for four-color combinations.
- **Add `c:multicolor`/`c:m` support**: Allow finding cards with 2+ colors using the `multicolor` or `m` color value.
- **Add `loyalty`/`loy` field**: Enable numeric queries on the loyalty column (data already stored in cards table).
- **Add explicit `name:` field**: Allow `name:bolt` as an explicit alternative to bare word search.
- **Add `!` exact name prefix**: Support `!"Lightning Bolt"` for exact (case-insensitive) name matching.
- **Add `banned:`/`restricted:` keywords**: Query legalities table by banned/restricted status (data already in `card_legalities`).
- **Add `pt:`/`powtou:` combined stat**: Enable numeric queries on combined power + toughness.
- **Add `mv:even`/`mv:odd` support**: Find cards with even or odd mana values.
- **Add `pow>tou` self-compare**: Allow comparing numeric fields against each other (e.g., `pow>tou`, `tou>=pow`).

## Capabilities

### New Capabilities
- `query-enhancements`: Covers all 11 query syntax additions — new fields, aliases, special values, exact name matching, and cross-field numeric comparisons.

### Modified Capabilities
- `query-parser`: New token types (`exactName`), `and` keyword handling, additional keyword map entries.
- `search-engine`: New query builder handlers for loyalty, banned, restricted, powtou, multicolor, exact name, mv:even/odd, and pow>tou self-compare.
- `core-types`: New SearchField values (`loyalty`, `banned`, `restricted`, `powtou`) and new AST node type (`ExactNameNode`).

## Impact

- **Code**: `src/models/query.ts`, `src/parser/tokenizer.ts`, `src/parser/parser.ts`, `src/search/query-builder.ts`
- **Tests**: New unit tests in tokenizer, parser, and query-builder test files; new integration tests in search-complex tests
- **Documentation**: `query.md` updated with all new syntax
- **Database**: No schema or migration changes — all features use existing tables and columns
- **Dependencies**: No new dependencies
