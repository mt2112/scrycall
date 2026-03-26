## Context

Scrycall currently supports 13 search fields with 7 operators, boolean logic (implicit AND, explicit OR), negation, and parentheses. A gap analysis against Scryfall.com's search syntax identified 11 improvements that require no database schema changes — all use existing tables and columns. The tokenizer, parser, query-builder, and model types are the only files affected.

Current architecture: query string → tokenizer (Token[]) → parser (AST) → query-builder (SQL + params) → SQLite execution. This pipeline is well-structured and each enhancement slots cleanly into one or more stages.

## Goals / Non-Goals

**Goals:**
- Close the most impactful Scryfall search syntax gaps using only existing data
- Add 4 new search fields (`loyalty`, `banned`, `restricted`, `powtou`)
- Add missing aliases (`e:`, `edition:`, `name:`, four-color names)
- Fix the `and` keyword bug that breaks natural query phrasing
- Add exact name matching (`!` prefix)
- Add special mana value queries (`mv:even`, `mv:odd`)
- Enable cross-field numeric comparisons (`pow>tou`)
- Support `c:multicolor` / `c:m` for multi-colored card filtering

**Non-Goals:**
- Schema or migration changes (no new columns, tables, or indexes)
- Import pipeline changes (no new data from Scryfall JSON)
- `is:` / `not:` predicates (requires derived-property infrastructure — separate change)
- `has:` queries (e.g., `has:watermark` — requires schema additions)
- Regular expression support (requires SQLite REGEXP extension)
- Display/ordering keywords (`order:`, `unique:`, `display:`)
- Price, artist, flavor text, frame, border queries (require schema additions)

## Decisions

### 1. Skip `and` as implicit (don't create a new token type)

`and` between terms is redundant since AND is already implicit. The tokenizer will simply skip the word (like whitespace) rather than creating an `AndToken` type.

**Alternative considered**: Creating an explicit `AndToken` — rejected because the parser already handles implicit AND via adjacency, adding a token type would complicate the parser for no behavioral difference.

### 2. Add `ExactNameNode` as a new AST node type

The `!` prefix for exact name matching (`!"Lightning Bolt"`) needs a new AST node rather than reusing `ComparisonNode`, because:
- It has no field/operator — just a name value
- The tokenizer emits it as a single token (not a keyword + value pair)
- SQL generation is simple (`cards.name = ? COLLATE NOCASE`) with no field dispatch

**Alternative considered**: Reusing `ComparisonNode` with field `name` and operator `=` — rejected because `name:bolt` with FTS5 search is semantically different from `!bolt` with exact match, and overloading the `=` operator would create ambiguity.

### 3. Multicolor as a special color value, not a separate field

`c:multicolor` and `c:m` will be handled inside `parseColors()` / `buildColorQuery()` as special values that generate `COUNT(card_colors) > 1` SQL, rather than creating a separate `multicolor` search field.

**Alternative considered**: New `SearchField` value `multicolor` — rejected because `multicolor` is a property of colors, not a separate domain. Users expect `c:multicolor` to work naturally alongside `c:red`, `c:gruul`, etc.

**Note**: No conflict with `m:` (mana field) — when the user writes `c:m`, the field is `color` and the value is `m`. The tokenizer already correctly separates field from value.

### 4. Self-compare via value detection in existing numeric handlers

For `pow>tou`, the numeric query handlers will check if the value string matches a known field reference (e.g., `pow`, `power`, `tou`, `toughness`, `loy`, `loyalty`, `cmc`, `mv`) and generate column-to-column SQL instead of column-to-parameter SQL.

**Alternative considered**: New `FieldCompareNode` AST type — rejected as over-engineered. The tokenizer already produces `{ field: 'power', operator: '>', value: 'tou' }` which the query builder can interpret directly.

### 5. Four-color alias names follow Scryfall conventions

Using Scryfall's established four-color names:
- `chaos` = UBRG (no white)
- `aggression` = WBRG (no blue)
- `altruism` = WURG (no black)
- `growth` = WUBG (no red)
- `artifice` = WUBR (no green)

### 6. `banned:` and `restricted:` reuse existing legalities table

The `card_legalities` table already stores `status` values including `banned` and `restricted`. These fields query with `status = 'banned'` or `status = 'restricted'` respectively, compared to `format:` which queries for `status IN ('legal', 'restricted')`.

## Risks / Trade-offs

- **`c:m` ambiguity** → Mitigated: tokenizer resolves `c:` as the field (color) and `m` as the value. The mana field is `m:` (where `m` is the field prefix). These are unambiguous in the token stream.
- **Self-compare complexity** → Mitigated: limited to a fixed set of known field names (`pow`, `power`, `tou`, `toughness`, `loy`, `loyalty`, `cmc`, `mv`). Unknown values fall through to numeric parsing as before.
- **`!` conflicts with `!=` operator** → Mitigated: `!` exact name only appears at the start of a term (not after a field prefix). The tokenizer handles `!=` within keyword parsing. `!` at term start is unambiguous.
- **`mv:even`/`mv:odd` string values in numeric field** → Mitigated: checked before `parseFloat` call. Only two string values are special-cased; all others proceed to numeric parsing.
