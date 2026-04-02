## 1. Define Progress Types

- [x] 1.1 Add `ImportProgressEvent` discriminated union type and `ImportProgressCallback` type to `src/models/index.ts`

## 2. Wire Progress Callback Through Import Pipeline

- [x] 2.1 Add `onProgress` to `ImportOptions` in `src/import/index.ts` and emit `manifest`, `download`, `parse` events at phase boundaries in `runImport`
- [x] 2.2 Add optional `onProgress` callback parameter to `importCards` in `src/import/importer.ts` and emit `write` and `index` events at the appropriate points
- [x] 2.3 Pass `onProgress` from `runImport` through to `importCards`

## 3. Render Progress in CLI

- [x] 3.1 Update `src/cli/commands/import.ts` to provide an `onProgress` callback that maps each phase to a descriptive `console.log` message
- [x] 3.2 Remove the existing hardcoded "Fetching Scryfall bulk data..." message

## 4. Tests

- [x] 4.1 Add test verifying `runImport` invokes `onProgress` callback with all phases in order
- [x] 4.2 Add test verifying `importCards` invokes `onProgress` callback with `write` and `index` phases
- [x] 4.3 Add test verifying import works without `onProgress` callback (backward compatibility)
