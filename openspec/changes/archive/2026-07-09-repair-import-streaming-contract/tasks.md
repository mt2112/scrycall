## 1. Import Pipeline Repair

- [x] 1.1 Change the importer to process parsed cards in bounded write batches instead of accumulating the full parsed card collection in memory
- [x] 1.2 Preserve atomic replacement semantics across bounded writes, using staging or transactional safeguards as needed

## 2. Explicit Contract Enforcement

- [x] 2.1 Add explicit handling for `scrycall import --force` so unsupported force behavior is rejected with a clear error message
- [x] 2.2 Change database migration discovery to fail fast when required migration assets are missing

## 3. Verification

- [x] 3.1 Add import and database tests covering bounded-memory writes, force-flag rejection, and fail-fast migration startup behavior
- [x] 3.2 Run the import, database, and CLI test suites to confirm the repaired contracts behave as specified