## 1. Data Layer

- [x] 1.1 Add `scryfallUri` field (`string | null`) to the `Card` interface in `src/models/card.ts`
- [x] 1.2 Create migration `002-add-scryfall-uri.sql` that adds `scryfall_uri TEXT` column to the `cards` table
- [x] 1.3 Add `scryfall_uri` to the `ScryfallCard` interface and INSERT statement in `src/import/importer.ts`
- [x] 1.4 Add `scryfall_uri` to `CardRow` interface and `mapRowToCard` function in `src/db/queries.ts`

## 2. Browser Utility

- [x] 2.1 Create `src/utils/browser.ts` with `openInBrowser(url)` function using platform-specific commands
- [x] 2.2 Add tests for `openInBrowser` in `tests/utils/browser.test.ts`

## 3. Card Command

- [x] 3.1 Add `--open` flag to the card command in `src/cli/commands/card.ts`
- [x] 3.2 On single match with `--open`, open `scryfallUri` in browser after displaying detail
- [x] 3.3 Handle missing `scryfallUri` by printing a re-import suggestion
- [x] 3.4 Add tests for `--open` behavior in `tests/cli/card-open.test.ts`

## 4. Search Command

- [x] 4.1 Add `--open` flag to the search command in `src/cli/commands/search.ts`
- [x] 4.2 When `--open` is passed, construct Scryfall search URL and open in browser after displaying results
- [x] 4.3 Add tests for `--open` behavior in `tests/cli/search-open.test.ts`

## 5. Interactive Search

- [x] 5.1 Update prompt text to `Enter card number (o to open, q to quit): `
- [x] 5.2 Recognize `o{N}` input pattern and open the corresponding card's Scryfall page
- [x] 5.3 Handle missing `scryfallUri` and invalid `o{N}` range
- [x] 5.4 Add tests for `o{N}` behavior in `tests/cli/interactive-search.test.ts`
