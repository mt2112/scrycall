## Context

The `search` command currently runs a query, formats results as a flat list (`formatCardList`), prints them, and exits. There is no way to drill into a result without running a separate `scry card "Name"` command. The `formatNumberedCardList` function already exists (added in the card-fuzzy-match change) and can be reused for numbered output.

The search command's action handler is synchronous — it opens the DB, runs the search, prints, and closes. Adding an interactive prompt requires keeping the DB open and introducing an async prompt loop.

## Goals / Non-Goals

**Goals:**
- Let users select a card from search results by number to see its detail
- Allow repeated selections without re-running the search
- Preserve current non-interactive output when stdout is piped or not a TTY

**Non-Goals:**
- No pagination of search results (scrolling through large result sets)
- No re-querying or filtering within the interactive loop
- No persistent state across separate command invocations
- No support for selecting multiple cards at once

## Decisions

### 1. TTY detection gates interactive mode

**Decision**: Use `process.stdout.isTTY` to determine whether to enter interactive mode. When piped (`scry search "query" | grep ...`), output is the same plain text as today.

**Rationale**: Interactive prompts break piped workflows. TTY detection is the standard Node.js pattern for this (used by `chalk`, `ora`, etc.). No configuration flag needed — the behavior is automatically correct.

**Alternatives considered**:
- *CLI flag `--interactive`*: More explicit, but adds friction. TTY detection is the convention.
- *Always interactive*: Breaks pipes and redirects.

### 2. Node.js readline for input

**Decision**: Use `node:readline` (built-in) to prompt for user input in the selection loop.

**Rationale**: Zero dependencies. The `readline` module provides `createInterface` with `question()` which handles line input cleanly. The prompt loop is simple: show prompt, read number, display card or error, repeat.

**Alternatives considered**:
- *Inquirer.js or prompts*: Full-featured but adds a dependency for a simple numeric prompt.
- *Raw `process.stdin` reads*: Lower-level, more code for the same result.

### 3. Reuse formatNumberedCardList for search output

**Decision**: In interactive mode, format search results using `formatNumberedCardList` (already exists). In non-interactive mode, keep using `formatCardList`.

**Rationale**: The numbered format is already built and tested. The search command just needs to choose which formatter to call based on TTY state.

### 4. Prompt loop with q/empty-line exit

**Decision**: After displaying results, show a prompt like `Enter card number (q to quit):`. Accept:
- A number (1-N): show card detail, then re-show the prompt
- `q` or empty input: exit
- Invalid input: show a brief error, re-prompt

**Rationale**: Simple, predictable, no hidden keybindings. Matches common CLI interactive patterns.

### 5. Keep DB open during interactive loop

**Decision**: Move `db.close()` to after the interactive loop completes, rather than immediately after printing results.

**Rationale**: The user may select multiple cards. Each selection needs to read card details (colors, keywords, legalities) from the DB. Opening and closing per selection would be wasteful.

## Risks / Trade-offs

- **Search action becomes async** — The `search` command's `.action()` handler must become `async` to use `readline`. Commander.js supports async actions, and the `import` command already uses one, so this is consistent. → No mitigation needed.
- **Large result sets produce long numbered lists** — If a search returns 100+ cards, the numbered list is unwieldy. This is an existing UX issue (same with `formatCardList`), not introduced by this change. Pagination is a non-goal for now. → Accept for now.
- **Card detail display interleaves with the list** — After showing a card's detail, the numbered list scrolls off screen. Users might forget which number they want. → Acceptable; they can re-run the search. A future improvement could re-show the list.
