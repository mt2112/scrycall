## Why

Scryfall's query syntax includes several commonly-used features that ScryCall doesn't yet support: the `is:`/`not:`/`has:` condition family, numeric color counts (`c=2`), and Strixhaven college color aliases. These gaps mean users familiar with Scryfall can't express many natural queries. Adding these features closes the most impactful syntax gaps with minimal schema changes since most can be derived from data already in the database.

## What Changes

- Add `is:`, `not:`, and `has:` as new keyword types in the tokenizer and parser, producing a new AST node type
- Implement derivable `is:` conditions that need no schema changes: `is:spell`, `is:permanent`, `is:historic`, `is:vanilla`, `is:frenchvanilla`, `is:bear`, `is:hybrid`, `is:phyrexian`, `is:modal`, `is:party`, `is:outlaw`
- Implement `not:` as syntactic sugar for `-is:` (already how Scryfall treats it)
- Implement `has:` conditions for existing data: `has:watermark` is out of scope (no column), but `has:pt` (has power/toughness) and `has:loyalty` are derivable
- Support numeric values in color queries (`c=2` means "exactly 2 colors", `c>=3` means "3 or more colors")
- Add Strixhaven college color aliases: `silverquill` (WB), `prismari` (UR), `witherbloom` (BG), `lorehold` (RW), `quandrix` (GU)

## Capabilities

### New Capabilities
- `is-conditions`: Framework for `is:`, `not:`, and `has:` keyword conditions — tokenizer support, AST node type, query builder dispatch, and initial set of derivable conditions

### Modified Capabilities
- `query-parser`: Add tokenization and parsing of `is:`, `not:`, and `has:` keywords; support numeric values for color field
- `search-engine`: Add query building for `is:`/`not:`/`has:` conditions and numeric color count comparisons
- `core-types`: Add `ConditionNode` AST type and `is`/`not`/`has` to `SearchField`

## Impact

- `src/parser/tokenizer.ts` — New keyword entries for `is`, `not`, `has`
- `src/parser/parser.ts` — Produce `ConditionNode` from `is`/`not`/`has` tokens
- `src/models/query.ts` — New `ConditionNode` type, extended `SearchField`
- `src/search/query-builder.ts` — New `buildConditionQuery` dispatcher, `buildColorQuery` extended for numeric values, college aliases in `COLOR_ALIASES`
- `tests/` — New and updated tests for all changes
