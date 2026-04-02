## 1. Display Functions

- [x] 1.1 Add `printNumberedSearchResults` to `src/output/display.ts` that formats search results using `formatNumberedCardList` and prints with a count summary
- [x] 1.2 Add unit tests for `printNumberedSearchResults`

## 2. Interactive Prompt Loop

- [x] 2.1 Create interactive prompt function in `src/cli/commands/search.ts` using `node:readline` that accepts a list of cards, displays a prompt, handles number selection / q / empty / invalid input, and loops until exit
- [x] 2.2 Add TTY detection to the search command action: if TTY, use numbered output and call the interactive prompt; if not TTY, use existing plain-text output
- [x] 2.3 Make the search command action handler async

## 3. Integration

- [x] 3.1 Keep database connection open until after interactive loop completes (move `db.close()` after prompt exits)
- [x] 3.2 On card selection, call `getCardByName` and `printCardDetail` to display the full card

## 4. Tests

- [x] 4.1 Add unit tests for the interactive prompt loop logic (valid selection, quit, empty, invalid input)
- [x] 4.2 Add CLI integration test verifying piped (non-TTY) output remains unchanged
- [x] 4.3 Build project and run full test suite
