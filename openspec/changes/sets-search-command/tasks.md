## 1. Database Schema

- [x] 1.1 Create migration 004-add-sets-table.sql with sets table schema (code PK, name, released_at, set_type, indexes)
- [x] 1.2 Register migration 004 in src/db/migrations.ts
- [x] 1.3 Verify migration runs without errors

## 2. Data Import

- [x] 2.1 Update src/import/importer.ts to collect unique sets from card stream
- [x] 2.2 Add set metadata insertion (code, name, released_at, set_type) using INSERT OR IGNORE
- [x] 2.3 Verify sets table is populated after running `scrycall import`
- [x] 2.4 Test reimport with --force flag (INSERT OR IGNORE handles duplicates)

## 3. Database Query Function

- [x] 3.1 Add SetRecord type to src/models/ (or inline in queries.ts)
- [x] 3.2 Implement searchSets() query function in src/db/queries.ts with smart term detection
- [x] 3.3 Implement year filtering logic (extract year from released_at)
- [x] 3.4 Implement type filtering with default hidden types (token, memorabilia, minigame, predraft, treasure_chest, vanguard)
- [x] 3.5 Implement --all flag to show all types
- [x] 3.6 Implement sorting (by released_at ascending, then code alphabetically)

## 4. CLI Command Implementation

- [x] 4.1 Create src/cli/commands/sets.ts with makeSetsCommand()
- [x] 4.2 Implement smart positional argument dispatch (4 digits → year, ≤5 non-numeric → code-first, else → name)
- [x] 4.3 Add --year flag support (single or comma-separated years)
- [x] 4.4 Add --type flag support (single or comma-separated types)
- [x] 4.5 Add --all flag to override default type filtering
- [x] 4.6 Implement no-argument behavior (display help)
- [x] 4.7 Register sets command in src/cli/index.ts
- [x] 4.8 Test command syntax: `scrycall sets --help`

## 5. Output Formatting

- [x] 5.1 Implement columnar output formatter (CODE, NAME, YEAR, TYPE)
- [x] 5.2 Implement "No matches found" message
- [x] 5.3 Implement "Empty sets table / Run 'scrycall import'" message
- [x] 5.4 Test output alignment and readability with various result sets

## 6. Testing

- [x] 6.1 Create tests/cli/sets.test.ts with command tests
- [x] 6.2 Test search by name (e.g., `scrycall sets strixhaven`)
- [x] 6.3 Test search by year (e.g., `scrycall sets 2021`)
- [x] 6.4 Test search by code (e.g., `scrycall sets stx`)
- [x] 6.5 Test --all flag (include hidden types)
- [x] 6.6 Test --year and --type flags
- [x] 6.7 Test no-argument help display
- [x] 6.8 Create tests/db/sets-queries.test.ts for query function
- [x] 6.9 Test searchSets() with various filters and term patterns
- [x] 6.10 Verify all existing tests still pass (`npx vitest run`)

## 7. Verification & Documentation

- [x] 7.1 Run `scrycall import` and verify sets table is populated
- [x] 7.2 Manual test: `scrycall sets strixhaven` → shows STX, STA, C21, etc.
- [x] 7.3 Manual test: `scrycall sets 2021` → shows all 2021 sets (filtered)
- [x] 7.4 Manual test: `scrycall sets stx` → shows exact code match
- [x] 7.5 Manual test: `scrycall sets strixhaven --all` → shows token/promo variants
- [x] 7.6 Manual test: `scrycall sets` (no args) → shows help
- [x] 7.7 Verify columnar output format and alignment
- [x] 7.8 Run full test suite: `npx vitest run` (no regressions)
