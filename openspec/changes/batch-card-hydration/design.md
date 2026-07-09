## Context

The database query helpers currently map a base card row and then issue follow-up queries for colors, color identity, keywords, and legalities per card. That keeps the mapping code simple at small scales, but it multiplies work across larger search results and ties read performance to result size in a predictable way.

## Goals / Non-Goals

**Goals:**
- Preserve the current `Card` shape returned by query helpers
- Replace per-card auxiliary lookups with set-based hydration for result collections
- Keep search and card-detail callers unchanged while improving read efficiency
- Centralize result mapping so auxiliary data rules are defined once

**Non-Goals:**
- Changing database schema or search syntax
- Reworking sets-search policy in the same change
- Introducing a new public repository layer for the whole application

## Decisions

### 1. Hydrate collections in batches keyed by `card_id`

Base card rows should be fetched first, then auxiliary data should be loaded once per normalized table for the full result set and grouped in memory. This avoids repeated SQL for each card while keeping the returned objects unchanged.

### 2. Reuse the same mapper for search and single-card paths where practical

Even when a query returns one card, the mapping logic should come from the same shared helper or batching abstraction. That reduces drift between detail and search views.

### 3. Optimize behavior behind existing helper signatures first

Callers should continue using `searchCards`, `getCardByName`, and related helpers. That keeps the proposal focused on the hydration seam rather than broader architecture changes.

## Risks / Trade-offs

- **[Batch hydration adds in-memory grouping work]** → The mapper becomes a little more complex. Mitigation: keep grouping logic small and isolated in one helper module.
- **[Single-card lookups may look less direct]** → Shared batching helpers can seem heavier for one-row reads. Mitigation: allow optimized single-id paths if they preserve the same mapping rules.
- **[Performance gains may be hidden by tests]** → Existing tests assert values, not query shape. Mitigation: add focused tests that verify bounded auxiliary-query counts for multi-card results.

## Migration Plan

1. Extract shared row-to-Card mapping helpers.
2. Change multi-card search helpers to batch-load auxiliary tables by `card_id`.
3. Align single-card detail lookups with the shared mapper.
4. Add targeted DB tests for multi-card hydration behavior and field completeness.

## Open Questions

- Whether single-card reads should use the exact same batching function or a thin specialized wrapper
- Whether substring and prefix search helpers should share one internal result-hydration path immediately