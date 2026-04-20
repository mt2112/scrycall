## Context

The search command currently treats `--open` as an additive behavior: it displays results to the console (with interactive prompt in TTY mode), and then opens Scryfall in the browser after the user quits the prompt. This means the user must navigate through the interactive prompt and press `q` before the browser opens, even though their intent with `--open` is to view results on Scryfall.

The relevant code is in `src/cli/commands/search.ts` — the `makeSearchCommand` action handler. The `--open` check currently sits *after* the TTY/interactive block.

## Goals / Non-Goals

**Goals:**
- When `--open` is provided, open the Scryfall search page immediately and exit — no console output, no interactive prompt
- Preserve local parse validation so syntax errors are caught before opening the browser
- Keep the local DB query execution (validates the query works)
- Print a brief confirmation to stderr so piping is not affected
- Leave all non-`--open` behavior completely unchanged (TTY interactive mode, piped plain text)

**Non-Goals:**
- Changing `card --open` behavior (different use case — detail + browser is fine there)
- Removing the interactive prompt's `o{N}` feature (still useful without `--open`)
- Changing the Scryfall URL format

## Decisions

### Short-circuit in action handler
Move the `--open` check above the TTY/interactive block. When `--open` is set and the query succeeds, build the Scryfall URL, open it, print a confirmation to stderr, and return immediately. The rest of the handler (console output, prompt loop) is never reached.

**Rationale**: This is the simplest structural change — one conditional block moves up and becomes a short-circuit `return`. No changes to `promptForSelection`, display functions, or the browser utility. The existing code paths are untouched.

**Alternative considered**: Adding a flag to `promptForSelection` to skip it — rejected because it's more complex for no benefit when we can just not call it.

### Confirmation message to stderr
Print something like `Opened Scryfall search in browser.` to stderr, not stdout.

**Rationale**: stderr keeps stdout clean for piping. Even though `--open` and piping are unlikely to be combined, consistency with existing error/status messages (which all go to stderr) is good practice.

### Keep local DB query execution
Even with `--open`, the query is parsed and executed against the local DB. Results are not displayed but the query is validated.

**Rationale**: The user may have run the same query before without `--open`. Running it locally ensures the query syntax is valid before opening the browser. If the query has parse or execution errors, the user sees the actual error message rather than getting a confusing Scryfall error page.

## Risks / Trade-offs

- **[Minor behavioral surprise]** Users who relied on seeing console results AND getting the browser open will lose the console output. → Mitigation: This is the intended change; users can omit `--open` to get console output.
- **[Test update needed]** `search-open.test.ts` currently asserts that stdout contains card names when `--open` is used. → Mitigation: Update test to assert no stdout output (or only stderr confirmation).
