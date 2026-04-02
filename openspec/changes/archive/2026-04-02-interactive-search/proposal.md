## Why

After running `scry search`, users see a list of matching cards but must manually retype a full card name with `scry card "Card Name"` to see details. This is friction — the user already found the cards they care about but has to leave the search context, remember or copy a name, and run a separate command. An interactive mode would let users drill into results directly from the search output.

## What Changes

- Add numbered indices to search results when running in a TTY terminal
- After displaying results in TTY mode, prompt the user to enter a number to see card details
- Allow repeated selections until the user quits (enter `q` or press Enter with no input)
- When stdout is piped (non-TTY), search output remains unchanged — no numbers, no prompt

## Capabilities

### New Capabilities
- `interactive-search`: TTY-aware interactive prompt loop after search results, allowing users to select a card by number to see its detail

### Modified Capabilities
- `cli-commands`: The search command gains interactive drill-down behavior when running in a TTY terminal
- `output-formatting`: Search result formatting adds numbered indices in interactive mode

## Impact

- `src/cli/commands/search.ts` — TTY detection, prompt loop, card detail display on selection
- `src/output/card-formatter.ts` — Reuse existing `formatNumberedCardList` for numbered search output
- `src/output/display.ts` — New display function for numbered search results
- Node.js `readline` module used for input (built-in, no new dependencies)
- No breaking changes — non-TTY output is unchanged
