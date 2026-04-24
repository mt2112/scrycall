## Context

ScryCall search results are currently returned in arbitrary database insertion order. The `search()` function in `src/search/search.ts` calls `parseQuery()` → `buildQuery()` → `searchCards()`, where `buildQuery()` returns a `SqlQuery` with `joins`, `where`, and `params` — but no ORDER BY clause. Scryfall supports `order:` and `direction:` as query keywords that control sort order.

The parser produces an AST (`QueryNode`) that is purely about filtering. Sort preferences need to travel alongside the AST but are not filter conditions themselves.

## Goals / Non-Goals

**Goals:**
- Support `order:<field>` keyword in query strings to control result sort order
- Support `direction:asc` / `direction:desc` to control sort direction
- Default to `name ASC` when no explicit `order:` is specified
- Handle sort as metadata alongside the filter AST, not as a filter node
- Keep the change minimal — thread sort options through existing layers

**Non-Goals:**
- Multi-column sorting (Scryfall doesn't support this either)
- Sort by fields not in the database (e.g., price, EDHREC rank)
- CLI flags for sorting (sorting lives in the query string, matching Scryfall's approach)
- `order:usd`, `order:tix`, `order:eur`, `order:edhrec`, `order:spoiled` (no price/external data)

## Decisions

### 1. Sort metadata as a separate type, not an AST node

**Decision:** Introduce a `SortOptions` type and a `ParsedQuery` wrapper that contains both the AST and sort options. The parser extracts `order:` and `direction:` tokens during parsing and returns them separately from the filter AST.

**Rationale:** `order:` and `direction:` are display keywords — they don't filter cards, they affect presentation. Mixing them into the filter AST would require the query builder to handle non-filtering nodes, violating its single responsibility. Scryfall also treats these as meta-keywords.

**Alternative considered:** Adding an `OrderNode` to the AST. Rejected because it would need special handling everywhere the AST is traversed, and it doesn't compose with AND/OR/NOT.

### 2. Parser returns `ParsedQuery` instead of raw `QueryNode`

**Decision:** Change the parser return type from `Result<QueryNode, ParseError>` to `Result<ParsedQuery, ParseError>` where:
```
ParsedQuery = { filter: QueryNode; sort: SortOptions }
SortOptions = { field: SortField; direction: 'asc' | 'desc' }
SortField = 'name' | 'cmc' | 'power' | 'toughness' | 'rarity' | 'color' | 'set'
```

**Rationale:** This is the narrowest API change. The `search()` function already consumes the parser's output and passes it to `buildQuery()`. Wrapping both pieces together keeps the call chain clean.

### 3. `buildQuery()` returns ORDER BY in `SqlQuery`

**Decision:** Add an `orderBy` field to `SqlQuery` containing the raw ORDER BY clause string. The query builder maps `SortField` values to SQL column expressions and applies the direction.

**Field-to-SQL mapping:**
| SortField    | SQL expression                   |
|-------------|----------------------------------|
| `name`      | `cards.name`                     |
| `cmc`       | `cards.cmc`                      |
| `power`     | `CAST(cards.power AS REAL)`      |
| `toughness` | `CAST(cards.toughness AS REAL)`  |
| `rarity`    | Ordinal expression (common=0...) |
| `color`     | `color_count` (via subquery)     |
| `set`       | `cards.set_code`                 |

### 4. Last `order:` / `direction:` wins

**Decision:** If multiple `order:` or `direction:` keywords appear in a query, the last one takes precedence. No error is raised.

**Rationale:** This matches Scryfall's behavior and is the simplest approach.

### 5. Supported sort field aliases

**Decision:** Accept both short and long forms consistent with existing field naming:
- `order:name` — name
- `order:cmc`, `order:mv` — mana value
- `order:power`, `order:pow` — power
- `order:toughness`, `order:tou` — toughness
- `order:rarity` — rarity
- `order:color` — color count
- `order:set` — set code

**Rationale:** Mirrors the alias patterns already used for search fields.

### 6. Tokenizer handles `order:` and `direction:` like regular keywords

**Decision:** The tokenizer recognizes `order:` and `direction:` as keyword tokens with their respective fields. The parser then intercepts these specific tokens and extracts them as sort metadata instead of adding them to the filter AST.

**Rationale:** Reuses existing tokenization machinery. The parser is already the right place to decide what goes in the AST vs. metadata.

## Risks / Trade-offs

- **[Breaking change to parser return type]** → Changing `parseQuery()` from returning `QueryNode` to `ParsedQuery` requires updating all call sites. Mitigation: there are few call sites (search.ts, tests), and the change is mechanical.
- **[Power/toughness sort with `*` values]** → CAST('*' AS REAL) returns 0 in SQLite, which would sort `*` creatures as if they had 0 power. Mitigation: Use `NULLIF` to convert `*` to NULL, then `NULLS LAST` behavior (SQLite sorts NULLs first by default, so we need a CASE expression).
- **[Color sort semantics]** → Sorting by "color" is ambiguous (WUBRG order? color count?). Decision: sort by color count (number of colors), matching Scryfall's `order:color` which sorts by color category. Single-color sorts before multicolor.
