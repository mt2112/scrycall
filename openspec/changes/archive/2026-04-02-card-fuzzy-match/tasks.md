## 1. Database Query Functions

- [x] 1.1 Add `searchCardsByPrefix` function to `src/db/queries.ts` — case-insensitive `LIKE '<input>%'` query, returns up to 10 cards ordered by name
- [x] 1.2 Add `searchCardsBySubstring` function to `src/db/queries.ts` — case-insensitive `LIKE '%<input>%'` query, returns up to 10 cards and total match count

## 2. Output Formatting

- [x] 2.1 Add `formatNumberedCardList` function to `src/output/card-formatter.ts` — numbered list of card names with mana cost and type, plus "N more" message when results are capped

## 3. Card Command Fallback Logic

- [x] 3.1 Update `src/cli/commands/card.ts` to call prefix search when exact match fails
- [x] 3.2 If prefix search returns no results, fall back to substring search
- [x] 3.3 Auto-select and display detail when exactly one match is found
- [x] 3.4 Display numbered suggestion list when multiple matches are found
- [x] 3.5 Show "Card not found" only when all searches return no results

## 4. Tests

- [x] 4.1 Add tests for `searchCardsByPrefix` — matches, no matches, case insensitivity, result limit
- [x] 4.2 Add tests for `searchCardsBySubstring` — matches, no matches, case insensitivity, total count
- [x] 4.3 Add tests for `formatNumberedCardList` — basic list, capped list with "N more" message
- [x] 4.4 Add tests for card command fallback behavior — single match auto-select, multiple match list, no match error
