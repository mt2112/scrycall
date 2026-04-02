## MODIFIED Requirements

### Requirement: Import returns statistics
The importer SHALL return `Result<ImportStats, ImportError>` where `ImportStats` includes `cardCount` (number of cards imported) and `duration` (elapsed time). The `runImport` function SHALL accept an optional `onProgress` callback in `ImportOptions`. When provided, the callback SHALL be invoked at each phase transition in order: `manifest`, `download`, `parse`, `write`, `index`.

#### Scenario: Successful import statistics
- **WHEN** an import completes successfully
- **THEN** the result contains the count of imported cards and the duration

#### Scenario: Progress callback receives all phases in order
- **WHEN** `runImport` is called with an `onProgress` callback and the import completes successfully
- **THEN** the callback is invoked with phases `manifest`, `download`, `parse`, `write`, `index` in that order

#### Scenario: Progress callback is optional
- **WHEN** `runImport` is called without an `onProgress` callback
- **THEN** the import completes normally with no progress reporting

#### Scenario: importCards receives progress callback
- **WHEN** `importCards` is called with an `onProgress` callback
- **THEN** the callback is invoked with `{ phase: 'write' }` before the database transaction and `{ phase: 'index' }` before FTS rebuild
