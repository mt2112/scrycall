## Why

The `scry import` command currently prints a single message at the start ("Fetching Scryfall bulk data...") and then shows nothing until the entire import completes. The import involves fetching a manifest, downloading ~80MB of JSON, parsing ~30K+ cards, writing to the database, and rebuilding the FTS index — which can take over a minute. Users have no visual indication that the process is progressing or which phase is currently executing.

## What Changes

- Add phase-level progress messages to the import command so users see status updates as each stage begins and completes
- Introduce a progress callback mechanism in the import pipeline so the CLI layer can render messages without the import logic depending on console output
- Display a final summary confirming the database was updated with card count and duration

## Capabilities

### New Capabilities
- `import-progress`: Progress reporting callback mechanism for the import pipeline, enabling the CLI to display phase-level status messages during import

### Modified Capabilities
- `data-import`: The import function signature changes to accept an optional progress callback, and the import pipeline emits progress events at phase boundaries
- `cli-commands`: The import command renders phase-level progress messages to the terminal as each import stage begins

## Impact

- `src/import/index.ts` — `runImport` accepts an optional progress callback and emits events at phase transitions
- `src/import/importer.ts` — `importCards` accepts an optional progress callback and emits events for write and index phases
- `src/cli/commands/import.ts` — Renders progress messages to stdout based on callback events
- `src/models/index.ts` or new type file — New `ProgressEvent` type definition
- No new dependencies required
- No breaking changes to the public API (callback is optional)
