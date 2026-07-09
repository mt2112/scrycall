## Context

`src/search/query-builder.ts` currently owns condition dispatch, alias resolution, join allocation, boolean composition, and sort generation in one file. The public surface is small, but every search enhancement now lands in the same hotspot, which makes review and regression analysis harder than it needs to be.

## Goals / Non-Goals

**Goals:**
- Preserve the existing `buildQuery` call pattern and supported query semantics
- Split query compilation into internal modules with explicit ownership boundaries
- Keep join allocation and sort generation deterministic for every build
- Strengthen parity tests so refactoring does not require guessing at search behavior

**Non-Goals:**
- Adding new query syntax or changing existing query semantics
- Rewriting the parser or the `search()` orchestration flow
- Changing CLI-visible output or sort defaults

## Decisions

### 1. Keep `buildQuery` as the stable public boundary

The refactor should happen behind the existing query-builder entry point so search callers do not change in the same proposal. This limits churn and lets test failures localize to the compilation layer.

### 2. Split by query-building concern, not by field count

Internal modules should own coherent responsibilities such as condition registries, field comparison builders, boolean composition, and sort SQL generation. This produces more stable seams than splitting by individual fields or keyword families.

### 3. Replace module-global join state with per-build state

Any alias or join-allocation state should live inside a per-build context object. That keeps compilation deterministic and removes hidden coupling across test cases and future concurrent callers.

### 4. Use parity tests as the migration guardrail

Existing query-builder and search tests should remain the primary verification surface. The refactor is complete only when modular internals produce equivalent SQL behavior for the supported query set.

## Risks / Trade-offs

- **[Over-splitting the builder]** → Too many tiny modules can make the compiler harder to follow. Mitigation: split only around stable responsibilities and keep the top-level assembly file readable.
- **[Semantic drift during extraction]** → Subtle query behaviors can change if helper boundaries are wrong. Mitigation: preserve current tests, add targeted parity cases for OR/NOT and sort handling, and keep the public API stable.
- **[Partial refactor leaves two ownership models]** → A halfway extraction could be more confusing than the original file. Mitigation: move each concern completely once extracted and avoid shadow implementations.

## Migration Plan

1. Add a build-context abstraction and move stateful allocation into it.
2. Extract sort generation and condition dispatch into separate internal modules.
3. Extract field comparison builders and boolean composition helpers.
4. Re-run query-builder and search integration tests until the modular implementation is parity-complete.

## Open Questions

- Whether `is:`/`has:` dispatch should live in a shared registry abstraction or remain a dedicated search-engine module
- Whether SQL string snapshots are worth adding for a few high-risk compound queries