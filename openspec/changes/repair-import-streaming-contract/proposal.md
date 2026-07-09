## Why

The import path claims streaming behavior and a working `--force` contract, but the current implementation buffers parsed cards in memory and never gives `force` any effect. Import reliability is one of the highest-risk parts of the toolchain, so the import and startup contracts need to be tightened before more data and packaging assumptions accumulate.

## What Changes

- Add import requirements that bounded-memory parsing and database writes remain compatible with atomic replacement semantics
- Clarify the CLI contract for `scrycall import --force` so the flag either has real freshness behavior or is explicitly rejected until caching exists
- Add a database startup requirement that migration assets fail fast when missing instead of deferring the failure to later SQL operations

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-import`: Add requirements for bounded-memory import execution and explicit import freshness behavior
- `cli-commands`: Clarify the observable behavior of `scrycall import --force`
- `database`: Add a requirement that missing migration assets surface as an immediate startup failure

## Impact

- Affected code: `src/import/index.ts`, `src/import/importer.ts`, `src/cli/commands/import.ts`, `src/db/migrations.ts`, import tests
- Affected systems: import streaming, import progress, database initialization, packaging reliability
- Compatibility: import behavior remains atomic, but `--force` semantics and startup failures become explicit and testable