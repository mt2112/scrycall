## Context

The import pipeline currently has four sequential phases: fetch manifest, download bulk JSON, parse JSON stream, and write to database (including FTS rebuild). These phases live across three files:

- `src/import/fetch.ts` — manifest fetch
- `src/import/index.ts` — orchestration (manifest + download + delegate to importer)
- `src/import/importer.ts` — JSON parse + DB write + FTS rebuild

The CLI layer (`src/cli/commands/import.ts`) calls `runImport()` which returns `Result<ImportStats, ImportError>`. There is no mechanism to report intermediate progress.

## Goals / Non-Goals

**Goals:**
- Give users visual feedback at each import phase so they know the process is alive and progressing
- Keep the import layer independent of console output (progress communicated via callback)
- Maintain the existing API contract — the callback is optional, so callers that don't need progress are unaffected

**Non-Goals:**
- No download byte-level progress (e.g., progress bars or percentage)
- No spinner or animated terminal UI — just simple log lines
- No additional npm dependencies
- No changes to import logic, transaction boundaries, or error handling

## Decisions

### 1. Callback-based progress reporting

**Decision**: Pass an optional `onProgress` callback through `runImport` and `importCards`.

**Rationale**: This keeps the import layer pure — it doesn't know about `console.log`, stdout, or terminal rendering. The CLI layer owns the rendering. This also makes progress easy to test without mocking globals.

**Alternatives considered**:
- *EventEmitter*: More ceremony for a simple one-directional notification. Would require creating an emitter, attaching listeners, and managing lifecycle. Overkill for 4-5 events.
- *Direct console.log in import layer*: Quick but couples library code to terminal output, making it untestable and unusable in non-CLI contexts.

### 2. Progress event as a discriminated union

**Decision**: Define progress events as a discriminated union type on a `phase` field:

```typescript
type ImportProgressEvent =
  | { phase: 'manifest' }
  | { phase: 'download' }
  | { phase: 'parse' }
  | { phase: 'write' }
  | { phase: 'index' }
```

**Rationale**: Simple, type-safe, extensible. New phases can be added without breaking existing callbacks. The CLI maps each phase to a human-readable message.

**Alternatives considered**:
- *String union*: `onProgress(phase: string)` — less type-safe, no room for phase-specific data later.
- *Numeric progress*: `onProgress(0.5)` — doesn't map well since total work is unknown during parse/download.

### 3. CLI renders simple log lines

**Decision**: The CLI maps each progress event to a `console.log` call with a descriptive message:

```
Fetching card catalog...
Downloading card data...
Parsing cards...
Writing to database...
Rebuilding search index...
Import complete: 30,412 cards in 42.3s
```

**Rationale**: Works in all environments (TTY, piped, CI). No terminal capability detection needed. Matches the existing CLI style.

### 4. Callback type as optional parameter

**Decision**: Add `onProgress` to `ImportOptions` rather than as a separate function parameter.

**Rationale**: Keeps the function signature stable. `ImportOptions` already exists and this is a natural extension. The callback is optional so the default behavior (no progress) is unchanged.

## Risks / Trade-offs

- **Granularity is coarse** — Users see 5 phase messages but nothing within a long phase (e.g., parsing 30K cards). This is acceptable for the simple approach and can be refined later by adding data to events (e.g., `{ phase: 'parse', cardsParsed: number }`).
- **FTS rebuild as separate phase** — The FTS rebuild is currently inside the DB transaction. Emitting a progress event between the inserts and the FTS rebuild means the callback fires mid-transaction, which is fine since the callback only logs and doesn't affect the transaction.
