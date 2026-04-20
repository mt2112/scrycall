## Why

When `--open` is passed to the search command, the user's intent is to view results on Scryfall in the browser. Currently they are forced through the console listing and interactive prompt, then must press `q` to quit before the browser opens. This adds unnecessary friction — the console output is redundant since the browser will show all results.

## What Changes

- When `--open` is provided, skip console output (numbered list or plain list) and the interactive prompt loop entirely
- Open the Scryfall search URL in the browser immediately after a successful local query
- Print a brief confirmation message to stderr (not stdout) so piping is unaffected
- Local parse validation still runs — if the query has a syntax error, the user sees the error and the browser does not open
- Local DB query still executes (validates query works locally) but results are not printed
- Without `--open`, all existing behavior remains identical: TTY gets numbered list + interactive prompt, piped gets plain list

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `cli-commands`: The search command's `--open` flag behavior changes from "display results then open browser after interactive prompt" to "open browser immediately, skip console output and prompt"
- `interactive-search`: The interactive prompt loop is skipped entirely when `--open` is provided

## Impact

- `src/cli/commands/search.ts`: Action handler reordered — `--open` check moves above TTY/interactive block as a short-circuit
- No API changes, no new dependencies
- Existing piping behavior (`scry search "query" | grep ...`) is unaffected since it only applies without `--open`
- Test `search-open.test.ts` will need updating to reflect that `--open` no longer produces console output
