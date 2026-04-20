## 1. Modify search command action handler

- [x] 1.1 Move `--open` check above the TTY/interactive block in `src/cli/commands/search.ts` so it short-circuits: build Scryfall URL, call `openInBrowser`, print confirmation to stderr, and return
- [x] 1.2 Remove the existing `--open` block that currently runs after the interactive prompt

## 2. Update specs

- [x] 2.1 Verify modified `cli-commands` spec scenarios match the new behavior
- [x] 2.2 Verify modified `interactive-search` spec scenarios match the new behavior

## 3. Update tests

- [x] 3.1 Update `tests/cli/search-open.test.ts` — the `--open` test should assert no stdout card output instead of expecting card names in stdout
- [x] 3.2 Add test: `--open` with parse error shows error to stderr and does not open browser
- [x] 3.3 Verify existing pipe tests in `tests/cli/search-cli.test.ts` still pass (no changes expected)
- [x] 3.4 Run full test suite to confirm no regressions
