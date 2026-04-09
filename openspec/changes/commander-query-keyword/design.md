## Context

The query system processes user input through three stages: tokenizer → parser → query-builder. The tokenizer recognizes keyword prefixes (e.g. `t:`, `c:`, `id:`) via a `KEYWORD_MAP` lookup. The parser builds an AST. The query-builder translates AST nodes to SQL.

Color identity subset queries already work via `id<=RG`, which generates `NOT EXISTS (SELECT 1 FROM card_color_identity WHERE card_id = cards.id AND color NOT IN ('R', 'G'))`. This correctly includes colorless cards (no identity rows → `NOT EXISTS` is trivially true).

The `commander:` keyword is a Scryfall convention meaning "color identity is a subset of the given colors" — the exact same semantics as `id<=`.

## Goals / Non-Goals

**Goals:**
- `commander:RG` returns cards whose color identity is a subset of {R, G}, including colorless
- Match Scryfall's `commander:` semantics exactly
- Reuse existing color identity subset SQL generation

**Non-Goals:**
- Supporting operator variants like `commander>=RG` or `commander=RG` — Scryfall only supports `commander:VALUE`
- Implying format legality — `commander:RG` does NOT auto-add `f:commander`
- Adding `edh:` as an alias

## Decisions

### 1. Add `commander` as a first-class SearchField

**Choice**: Add `'commander'` to the `SearchField` type union, register `'commander': 'commander'` in `KEYWORD_MAP`, and handle it in `buildComparisonSql`.

**Alternatives considered**:
- **Parser-level rewrite** (rewrite `commander:X` to `{ field: 'colorIdentity', operator: '<=', value: X }` in the tokenizer): Simpler, but hides the semantic difference between `commander:` and `id:` from the type system. Would make `commander:` invisible to anything inspecting the AST.
- **Document `id<=RG` only**: Zero implementation cost but poor Scryfall compatibility. Commander players frequently use this syntax.

**Rationale**: A dedicated field is explicit, discoverable, and costs very little (one type variant, one map entry, one case branch).

### 2. Hard-wire `<=` semantics for `commander:` regardless of user-provided operator

**Choice**: In `buildComparisonSql`, the `commander` case always delegates to `buildColorQuery('colorIdentity', '<=', value)`, ignoring whatever operator the user typed.

**Rationale**: Scryfall's `commander:` only supports the `:` operator. If a user writes `commander>=RG` (unlikely), treating it as `<=` is more useful than erroring.

### 3. Delegate entirely to existing `buildColorQuery`

**Choice**: No new SQL generation — `commander` routes to the same `buildColorQuery` function used by `color` and `colorIdentity` fields, just with a fixed `<=` operator.

**Rationale**: The SQL for color identity subset is already correct and tested. No duplication.

## Risks / Trade-offs

- **Operator overloading**: `commander:RG` means subset (≤) while `id:RG` means superset (≥). Users who conflate the two may be confused. → Mitigated by matching Scryfall's documented behavior exactly.
- **Future operator support**: If Scryfall adds `commander>=` or `commander=` in the future, we'd need to revisit the hard-wired `<=`. → Low risk; Scryfall hasn't changed this in years.
