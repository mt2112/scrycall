## Why

The search command's default behavior in a TTY is to show numbered results and enter an interactive prompt loop. Most of the time users just need the card names — the interactive loop adds an extra `q` step to exit. The plain list should be the default, with interactive mode available via an explicit `--interactive` / `-i` flag.

## What Changes

- The search command's default output becomes the plain-text card list (no numbers, no prompt) regardless of TTY status
- A new `--interactive` / `-i` flag enables the numbered list with interactive prompt loop
- `--interactive` is silently ignored when stdout is not a TTY (can't do interactive without a terminal)
- `--open` takes precedence over `--interactive` when both are provided
- The `card` command is unchanged — its numbered disambiguation lists are not affected

## Capabilities

### New Capabilities

_None — this change modifies existing capabilities only._

### Modified Capabilities

- `cli-commands`: Search command default behavior changes from TTY-gated interactive mode to plain list; new `--interactive` / `-i` flag added
- `interactive-search`: Interactive mode is no longer triggered by TTY detection alone; requires explicit `--interactive` flag (with TTY as safety guard)

## Impact

- `src/cli/commands/search.ts` — branching logic changes from `isTTY` check to `options.interactive && isTTY` check; new Commander option added
- `openspec/specs/cli-commands/spec.md` — scenarios referencing TTY-gated interactive behavior need updating
- `openspec/specs/interactive-search/spec.md` — TTY detection requirement changes to flag-based activation
- Tests: `search-cli.test.ts`, `search-open.test.ts`, `interactive-search.test.ts` — assertions about default behavior need updating
