## Context

The import flow streams the download from Scryfall but then accumulates parsed cards in memory before writing them to SQLite, which undercuts the bounded-memory contract in the existing import spec. At the same time, the `--force` flag is exposed in the CLI without any real effect, and migration asset discovery fails open in a way that can defer packaging problems until much later runtime failures.

## Goals / Non-Goals

**Goals:**
- Make importer memory usage scale with batch size rather than total card count
- Preserve atomic replacement semantics for successful imports
- Replace the inert `--force` contract with an explicit, testable CLI behavior
- Fail fast when required migration assets are missing during database startup

**Non-Goals:**
- Replacing SQLite or the stream-json pipeline
- Adding a full import resume system
- Redesigning progress phases beyond what bounded-memory writes require

## Decisions

### 1. Use chunked writes inside an atomic import strategy

The importer should parse cards incrementally and write them in bounded batches, while still preserving all-or-nothing replacement semantics. If direct replacement becomes awkward, a staging-table or staged-delete strategy is preferred over buffering the entire dataset in memory.

### 2. Make `--force` explicit instead of inert

Until freshness metadata exists, the CLI should reject `--force` with an explanatory error rather than silently pretending to support special behavior. A future proposal can reintroduce force semantics once caching and freshness state are designed.

### 3. Treat missing migration assets as startup failures

Database initialization should stop immediately if required migration files are unavailable. That makes packaging and deployment failures diagnosable at startup instead of surfacing as downstream SQL errors.

## Risks / Trade-offs

- **[Atomic import logic gets more complex]** → Chunked writes and replacement safety can complicate control flow. Mitigation: keep write staging explicit and back it with transaction-focused tests.
- **[Rejecting `--force` changes current CLI behavior]** → Users may rely on the flag even though it does nothing. Mitigation: emit a clear message explaining why it is rejected and how to run a normal import instead.
- **[Fail-fast migrations can break mispackaged builds earlier]** → Startup failures become more immediate. Mitigation: that is intentional and should be covered by packaging-oriented tests.

## Migration Plan

1. Introduce bounded batch writing in the importer while preserving progress callbacks and atomicity.
2. Add explicit CLI handling for unsupported `--force` behavior.
3. Change migration asset discovery to throw a startup error when files are missing.
4. Add import and database tests covering bounded-memory flow, force rejection, and fail-fast startup.

## Open Questions

- Whether staging tables are necessary or whether batched writes within the existing transaction are sufficient
- Whether `runImport` or the CLI adapter should own the explicit `--force` rejection message