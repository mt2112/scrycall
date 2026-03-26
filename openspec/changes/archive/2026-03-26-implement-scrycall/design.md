## Context

Scrycall is a greenfield TypeScript CLI application for offline Magic: The Gathering card search. There is no existing codebase — the project is defined entirely by the architecture document (agent.md). The tool replicates a core subset of Scryfall's search syntax against a local SQLite database populated from the Scryfall Bulk Data API.

Key constraints from agent.md:
- **Functional style** — no classes, pure functions, composition, named exports only
- **Result types** — never throw for expected errors; use `Result<T, E>` unions
- **Synchronous DB** — better-sqlite3 is sync by design, no async/await for DB ops
- **ESM** — `"type": "module"`, `.js` extensions in relative imports
- **Strict TypeScript** — `strict: true`, no `any`, explicit return types

## Goals / Non-Goals

**Goals:**
- Implement all three CLI commands: `import`, `search`, `card`
- Support the full query syntax subset defined in agent.md (colors, types, oracle text, mana value, power/toughness, rarity, set, format, keywords, color identity, bare text)
- Stream-parse bulk data to avoid loading 162 MB JSON into memory
- Use FTS5 for full-text search on name, oracle text, and type line
- Handle color queries as set operations (superset/subset/exact match)
- Provide clear error messages with position indicators for parse failures

**Non-Goals:**
- Card images or graphical display
- Scryfall API for individual card lookups (bulk data only)
- Multi-face card layout handling beyond basic oracle_text
- Price data or market information
- Web UI or HTTP server
- Automatic background data updates

## Decisions

### 1. ESM + TypeScript strict mode

**Choice**: ESM (`"type": "module"`) with TypeScript `strict: true` targeting ES2022.

**Rationale**: ESM is the modern standard and aligns with the ecosystem direction. ES2022 target provides native `structuredClone`, `Object.hasOwn`, and top-level await if ever needed. Strict mode catches type errors early.

**Alternatives**: CommonJS would avoid `.js` extension hassle but is legacy.

### 2. Result<T, E> pattern for error handling

**Choice**: All functions that can fail return `Result<T, E>` union types. Thrown exceptions reserved for programmer errors only.

**Rationale**: Makes error paths explicit in type signatures. Callers must handle failures — no silent swallowing. Aligns with functional style mandate.

**Alternatives**: try/catch with typed errors — more idiomatic in JS but hides error paths from type system.

### 3. Recursive-descent parser with implicit AND precedence

**Choice**: Hand-written recursive descent parser. AND (implicit juxtaposition) binds tighter than OR. Parentheses override precedence.

**Rationale**: Simple to implement, easy to extend, produces clear error messages with position information. The grammar is small enough that a parser generator is overkill.

**Alternatives**: Pratt parser (slightly more elegant for precedence but more complex for this small grammar), PEG.js (adds build-time dependency for a simple grammar).

### 4. SQLite with FTS5 and auxiliary tables

**Choice**: Single SQLite file at `~/.scrycall/cards.db`. Main `cards` table, separate tables for array fields (colors, color_identity, keywords, legalities), FTS5 virtual table on name/oracle_text/type_line.

**Rationale**: SQLite is zero-config, single-file, and fast for read-heavy workloads. FTS5 provides efficient text search. Auxiliary tables normalize array data for set-operation queries (e.g., "colors contain red AND green"). WAL mode enables concurrent reads.

**Alternatives**: JSON file (too slow for queries), Postgres/MySQL (overkill for local CLI), embedded search library like MiniSearch (no SQL query flexibility).

### 5. Streaming JSON import with stream-json

**Choice**: Use `stream-json` to stream-parse the Scryfall bulk data JSON array. Process cards in chunks within a single database transaction.

**Rationale**: The oracle_cards file is ~162 MB. Loading it entirely into memory is wasteful and risks OOM on constrained systems. Streaming processes cards as they arrive, keeping memory usage constant.

**Alternatives**: Load full JSON with `JSON.parse` (simple but memory-heavy), JSONL format (Scryfall doesn't offer it for oracle_cards).

### 6. Color matching as set operations

**Choice**: Color queries use set logic via SQL JOINs on `card_colors`:
- `c:rg` → colors include both R and G (superset check via HAVING COUNT = N)
- `c=rg` → colors are exactly R and G
- `c>=rg` → colors are a superset of {R, G}
- `c<=rg` → colors are a subset of {R, G}

**Rationale**: Matches Scryfall semantics exactly. Normalized auxiliary tables make set operations natural SQL queries.

### 7. Commander.js for CLI framework

**Choice**: Commander.js for command parsing and help generation.

**Rationale**: Mature, well-documented, zero-config for simple CLIs. Supports subcommands (`import`, `search`, `card`), option parsing, and auto-generated help. No need for a heavier framework like oclif.

### 8. Migration-based schema management

**Choice**: Versioned `.sql` files in `src/db/migrations/`, tracked via a `_migrations` table.

**Rationale**: Simple, transparent, no ORM dependency. SQL files can be reviewed directly. Forward-only migrations are sufficient for a local tool (no team coordination needed).

## Risks / Trade-offs

- **[Risk] Scryfall API changes** → Bulk data format is stable and versioned. Pin to known field set. Import handles unknown fields gracefully (ignore them).
- **[Risk] Large import time** → Stream processing and single-transaction batching keep imports under 60 seconds for full dataset. `--force` flag allows re-import.
- **[Risk] Power/toughness `*` values** → Store as text, treat `*` as NULL in numeric comparisons. Document behavior.
- **[Risk] FTS5 query injection** → Use parameterized queries exclusively. Never interpolate user input into FTS5 MATCH strings without escaping.
- **[Trade-off] Sync DB blocks event loop** → Acceptable for CLI (no concurrent requests). better-sqlite3's sync API is actually faster than async alternatives for sequential operations.
- **[Trade-off] No incremental updates** → Full import replaces all data. Simple and reliable, but slower than diffing. Acceptable for weekly import cadence.
