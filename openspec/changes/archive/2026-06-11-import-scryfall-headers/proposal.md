## Why

The import pipeline currently sends requests to Scryfall without explicitly setting the required `User-Agent` and `Accept` headers. Scryfall rejects these requests with HTTP 400 when `User-Agent` is not application-defined, causing `scry import` to fail before data download begins.

## What Changes

- Add explicit HTTP headers for import-related requests to Scryfall endpoints.
- Set `User-Agent` using the application name `scrycall` (versioned format) and ensure `Accept` is always present.
- Apply headers consistently to both manifest fetch and bulk download fetch in the import flow.
- Add/adjust tests to verify required headers are sent.

## Capabilities

### New Capabilities
- `import-http-headers`: Ensures all import HTTP requests to Scryfall include required `User-Agent` and `Accept` headers.

### Modified Capabilities
- `data-import`: Import network request requirements are updated to require explicit Scryfall-compliant headers.

## Impact

- Affected code:
  - `src/import/fetch.ts`
  - `src/import/index.ts`
  - `tests/import/run-import.test.ts`
- No external API changes for CLI users.
- No new runtime dependencies.
