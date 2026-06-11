## 1. Database Migration

- [x] 1.1 Create `src/db/migrations/003-add-layout-and-tags.sql` with: `ALTER TABLE cards ADD COLUMN layout TEXT`, `CREATE TABLE card_tags (card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE, tag TEXT NOT NULL, PRIMARY KEY (card_id, tag))`, `CREATE INDEX idx_card_tags_tag ON card_tags(tag)`
- [x] 1.2 Verify migration applies cleanly on existing database (test in `tests/db/connection.test.ts`)

## 2. Tagger Module

- [x] 2.1 Create `src/import/tagger.ts` with `ScryfallCard` type import, `TAG_RULES: Record<string, (card: ScryfallCard) => boolean>`, and `tagCard(card): string[]` function
- [x] 2.2 Implement land nickname tag rules: `dual` (hardcoded 10 names), `fetchland`, `shockland`, `checkland`, `fastland`, `slowland`, `painland`, `gainland`, `scryland`, `bounceland`, `bikeland`, `triome`, `tangoland`, `bondland`, `canopyland`, `shadowland`, `filterland`, `storageland`, `surveilland`, `manland`, `pathway`
- [x] 2.3 Implement commander/format tag rules: `commander`, `partner`, `companion`, `brawler`, `oathbreaker`
- [x] 2.4 Create `tests/import/tagger.test.ts` with unit tests for each tag rule using mock ScryfallCard objects — test positive matches and negative (non-matching) cases

## 3. Importer Changes

- [x] 3.1 Add `layout?: string` to `ScryfallCard` interface in `src/import/importer.ts`
- [x] 3.2 Update the INSERT card prepared statement to include `layout` column
- [x] 3.3 Add `layout: card.layout ?? null` to the insertCard.run() call
- [x] 3.4 Add prepared statement for `INSERT OR IGNORE INTO card_tags (card_id, tag) VALUES (?, ?)`
- [x] 3.5 Add `db.exec('DELETE FROM card_tags')` to the import transaction cleanup
- [x] 3.6 After inserting card colors/keywords/legalities, call `tagCard(card)` and insert each returned tag
- [x] 3.7 Update importer tests to verify layout is stored and tags are inserted

## 4. Query Builder Changes

- [x] 4.1 Add `TAG_ALIASES: Record<string, string>` map to `src/search/query-builder.ts` with all alias→canonical mappings
- [x] 4.2 Add layout-based conditions to `IS_CONDITIONS` dict: `split`, `flip`, `transform`, `dfc`, `mdfc`, `meld`, `leveler`
- [x] 4.3 Modify `buildIsQuery` to resolve aliases first, then check dict, then fall through to `card_tags` EXISTS query
- [x] 4.4 Modify `buildNotConditionQuery` to handle tag-based fallthrough correctly (NOT EXISTS)
- [x] 4.5 Add query builder tests: layout conditions, tag fallthrough SQL generation, alias resolution, not: with tags

## 5. Integration Verification

- [x] 5.1 Run full test suite to verify no regressions
- [x] 5.2 Manual test: reimport database with `nvs use lts && npm run build && node dist/cli/index.js import`, then test queries like `is:fetchland`, `is:dual`, `is:commander`, `is:split`, `is:cycleland`, `not:fetchland`
