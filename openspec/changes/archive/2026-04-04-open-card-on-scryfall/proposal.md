## Why

Users searching for cards via the CLI have no way to see what the card actually looks like. Card imagery is a core part of the Magic: The Gathering experience — visual confirmation of a card is often more useful than reading its text properties. Scryfall already hosts high-quality images for every card; we should provide easy access to them from the CLI.

## What Changes

- Add `--open` flag to the `card` command that opens the card's Scryfall page in the user's default browser
- Add `--open` flag to the `search` command that opens the Scryfall search grid view for the query, showing all result card images on a single page
- Extend interactive search prompt to support `o{N}` input (e.g., `o3`) to open a specific card's Scryfall page from the results list
- Store `scryfall_uri` from Scryfall bulk data during import so card pages can be opened without runtime API calls
- Add a cross-platform `openInBrowser(url)` utility

## Capabilities

### New Capabilities
- `browser-open`: Cross-platform utility for opening URLs in the default browser, and CLI flag handling for `--open` on card/search commands

### Modified Capabilities
- `core-types`: Add `scryfallUri` field to the Card interface
- `database`: Add `scryfall_uri` column to the cards table (migration 002)
- `data-import`: Capture `scryfall_uri` from Scryfall bulk data during import
- `cli-commands`: Add `--open` flag to `card` and `search` commands
- `interactive-search`: Support `o{N}` input to open a card's Scryfall page from search results

## Impact

- **Database**: New migration required (002) to add `scryfall_uri` column. Users must re-import after upgrade.
- **Card model**: One new field added (`scryfallUri`), non-breaking addition.
- **CLI**: Two commands gain a new optional flag. Interactive prompt gains a new input pattern. No breaking changes to existing behavior.
- **Dependencies**: Uses Node.js `child_process` for launching the browser — no new external dependencies.
