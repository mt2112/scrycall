## Context

ScryCall currently supports 18 keyword prefixes (e.g., `c:`, `t:`, `o:`, `f:`) and 8 bare numeric keywords (`mv`, `pow`, `tou`, etc.). The Scryfall search syntax includes a large family of boolean condition keywords — `is:`, `not:`, and `has:` — that provide commonly-used shortcuts for complex queries (e.g., `is:spell` instead of manually excluding lands, `is:hybrid` instead of regex on mana cost). Additionally, numeric color counts (`c=2`) and Strixhaven college aliases are small gaps in color query coverage.

The tokenizer, parser, and query builder follow a clean layered architecture:
```
Input → Tokenizer → Token[] → Parser → QueryNode AST → QueryBuilder → SQL
```

All three features can be added without schema changes — they operate on data already stored in the database.

## Goals / Non-Goals

**Goals:**
- Add `is:`, `not:`, and `has:` as recognized keyword types that flow through the full pipeline
- Implement an initial set of derivable conditions that require no schema changes
- Support numeric values in color queries (`c=2`, `c>=3`)
- Add Strixhaven college color aliases
- Keep the `is:` framework extensible so future conditions are easy to add

**Non-Goals:**
- Conditions requiring new database columns (e.g., `is:foil`, `is:reprint`, `is:full`, `has:watermark`) — those need schema/import work first
- Land cycle shortcuts (`is:fetchland`, `is:shockland`) — need curated card lists
- `is:commander`, `is:companion` — need cross-referencing legality + type rules
- Tagger tags, cube membership, or other Scryfall-specific external data

## Decisions

### 1. `is:`/`not:`/`has:` as keyword tokens, not a new token type

**Decision:** Treat `is`, `not`, `has` as entries in `KEYWORD_MAP` mapping to new `SearchField` values (`'is'`, `'not'`, `'has'`). They produce the same `ComparisonNode` AST node as other keywords — no new AST node type needed.

**Rationale:** `is:spell` is structurally identical to `c:red` — it's `field:value`. By reusing `ComparisonNode`, the parser needs zero changes. The query builder simply dispatches `is`/`not`/`has` fields to new builder functions. This is simpler than adding a `ConditionNode`, and `not:X` can trivially be translated to `NOT (is:X)` at the SQL level.

**Alternative considered:** A dedicated `ConditionNode` AST type. Rejected because it adds complexity across 3 files (model, parser, query-builder) for no functional benefit — the semantics are the same as a comparison.

### 2. Condition dispatch via a lookup table

**Decision:** The query builder will have an `IS_CONDITIONS` map from condition name to a SQL-generating function:

```
IS_CONDITIONS: Record<string, (negate: boolean) => SqlQuery>
```

`buildIsQuery(value)` looks up the condition and calls the function. `buildNotQuery(value)` calls the same function with `negate: true`. `buildHasQuery(value)` has its own smaller map.

**Rationale:** This makes adding new conditions a one-line-per-condition change. Each condition function is self-contained and testable. The pattern mirrors how `buildQuery` already dispatches by field name.

### 3. Initial `is:` conditions — derivable from existing data

The following conditions can be computed from columns already in the database:

| Condition | SQL Logic | Data Source |
|-----------|-----------|-------------|
| `is:spell` | `type_line NOT LIKE '%Land%'` AND has a mana_cost or is an instant/sorcery | `type_line`, `mana_cost` |
| `is:permanent` | `type_line` matches creature, artifact, enchantment, planeswalker, land, or battle | `type_line` |
| `is:historic` | `type_line` matches legendary, artifact, or saga | `type_line` |
| `is:vanilla` | Is a creature with NULL or empty `oracle_text` | `type_line`, `oracle_text` |
| `is:frenchvanilla` | Is a creature whose oracle text contains only keyword abilities | `type_line`, `oracle_text`, `card_keywords` |
| `is:modal` | `oracle_text` contains "choose one" or "choose two" etc. | `oracle_text` |
| `is:bear` | Is a 2/2 creature with cmc = 2 | `type_line`, `power`, `toughness`, `cmc` |
| `is:hybrid` | `mana_cost` contains `{X/Y}` pattern (hybrid mana symbols) | `mana_cost` |
| `is:phyrexian` | `mana_cost` contains `{X/P}` pattern (Phyrexian mana symbols) | `mana_cost` |
| `is:party` | `type_line` contains cleric, rogue, warrior, or wizard (and is a creature) | `type_line` |
| `is:outlaw` | `type_line` contains assassin, mercenary, pirate, rogue, or warlock (and is creature) | `type_line` |

**Decision on `is:frenchvanilla`:** This is the trickiest — it requires checking that oracle text consists *only* of keyword abilities. Implementation: match oracle_text against the card's own keywords list. If every line of oracle text corresponds to a keyword in `card_keywords`, it's french vanilla. If this proves too complex to get right, defer it.

### 4. `has:` conditions — check for non-null data

| Condition | SQL Logic |
|-----------|-----------|
| `has:pt` | `power IS NOT NULL AND toughness IS NOT NULL` |
| `has:loyalty` | `loyalty IS NOT NULL` |

More `has:` conditions (like `has:watermark`, `has:indicator`) are blocked on schema additions.

### 5. Numeric color count — extend `buildColorQuery`

**Decision:** When the value in a color query is a pure number, interpret it as a count of colors. `c=2` means "exactly 2 colors", `c>=3` means "3+ colors", etc.

**Implementation:** In `buildColorQuery`, check if value is numeric before looking up `COLOR_ALIASES`. If numeric, use `COUNT` on `card_colors` with a `GROUP BY` and `HAVING` clause.

### 6. Strixhaven college aliases — add to `COLOR_ALIASES`

Five entries added to the existing `COLOR_ALIASES` map:

| Alias | Colors |
|-------|--------|
| `silverquill` | W, B |
| `prismari` | U, R |
| `witherbloom` | B, G |
| `lorehold` | R, W |
| `quandrix` | G, U |

These overlap with existing guild aliases (orzhov, izzet, golgari, boros, simic) but Scryfall supports both naming conventions.

## Risks / Trade-offs

**`is:spell` definition ambiguity** → Scryfall's definition is nuanced (tokens aren't spells, lands aren't spells). Our data doesn't have a layout/token flag, so we approximate: "not a land and not a token" via type_line. Mitigation: document the approximation, refine when layout data is available.

**`is:frenchvanilla` complexity** → Accurately detecting french vanilla creatures requires cross-referencing oracle text lines against keyword abilities. Risk of false positives/negatives with complex keyword reminder text. Mitigation: start with a simple heuristic (oracle text is empty or every word matches a keyword), accept imperfection, or defer.

**`not:` keyword conflicts with `NotNode`** → The tokenizer must distinguish `not:reprint` (a condition keyword) from `-t:creature` (negation prefix). Since `not` followed by `:` is unambiguous as a keyword, and `-` is already handled as negation, there's no actual conflict — but it's worth noting for maintainability.

**Namespace growth** → The `is:` namespace is large in Scryfall (~60+ conditions). This design handles the initial batch; future conditions get added to the dispatch map. No architectural risk, just incremental work.
