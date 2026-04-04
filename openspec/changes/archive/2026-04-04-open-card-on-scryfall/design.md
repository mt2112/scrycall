## Context

scrycall is a CLI tool that searches a local SQLite database of Magic: The Gathering cards imported from Scryfall's bulk data. Currently the tool outputs text-only card information — name, mana cost, type, oracle text, power/toughness, set, and rarity. There is no way to view card imagery from the CLI.

Scryfall provides `image_uris` and `scryfall_uri` fields in their bulk data. The importer currently discards these fields. The card's Scryfall UUID (`id`) is stored in the database.

## Goals / Non-Goals

**Goals:**
- Let users quickly see card images from the CLI via their default browser
- Provide a single-page visual grid for search results via Scryfall's search page
- Support image access in both direct command invocation and interactive search mode
- Work cross-platform (Windows, macOS, Linux)

**Non-Goals:**
- Inline terminal image rendering (Sixel, iTerm2, Kitty protocols)
- Storing or caching images offline
- Storing all `image_uris` variants — only `scryfall_uri` (the page URL) is needed
- Adding image-related query syntax or search fields

## Decisions

### 1. Store `scryfall_uri` rather than constructing URLs at runtime

**Decision:** Add `scryfall_uri` column to the cards table and populate it during import.

**Alternatives considered:**
- *Construct from `set_code` + `collector_number`*: We don't store `collector_number`, would require a second new column. URL pattern (`/card/{set}/{num}/{slug}`) also requires a name slug.
- *Live API call to `/cards/{id}`*: Adds network latency and API dependency at display time. Scryfall rate limits apply.
- *Use the redirect endpoint `/cards/{id}?format=image`*: Only provides the image, not the full Scryfall page with rulings, prices, and printings.

**Rationale:** `scryfall_uri` is already present in the bulk data we import. Storing it is a single column addition with zero runtime cost.

### 2. Search `--open` passes the query to Scryfall's search page rather than constructing a collection URL

**Decision:** Construct `https://scryfall.com/search?q={query}&unique=cards&as=grid` from the user's raw query string.

**Alternatives considered:**
- *Build a multi-card collection URL using stored card IDs*: Scryfall's `/cards/collection` API is POST-only, not linkable. Would require a custom page or service.
- *Open individual card pages for each result*: Opening N browser tabs for N results is hostile UX.

**Rationale:** Our query syntax is modeled after Scryfall's. Most queries work on both systems. The `unique=cards` parameter matches our oracle-cards-only dataset. If minor syntax differences cause Scryfall to return slightly different results, that's acceptable — the local search already provided the authoritative results in the terminal.

### 3. Browser launching via `child_process.execFile` with platform detection

**Decision:** Use `process.platform` to select the appropriate command: `start` (Windows), `open` (macOS), `xdg-open` (Linux).

**Alternatives considered:**
- *`open` npm package*: Adds an external dependency for something achievable in ~10 lines.

**Rationale:** The platform commands are well-established and reliable. No external dependency needed. On Windows, `start` requires `cmd /c start "" "URL"` to handle URLs with special characters.

### 4. Interactive search uses `o{N}` pattern for opening cards

**Decision:** Extend the existing readline prompt to recognize `o` followed by a number (e.g., `o3`) to open that card's Scryfall page.

**Rationale:** Follows the existing pattern where a plain number shows card detail. The `o` prefix is mnemonic for "open." The prompt hint updates to `(o to open, q to quit)` to make it discoverable.

### 5. `--open` flag shows local results AND opens browser

**Decision:** For both `card` and `search`, the `--open` flag is additive — normal output is produced first, then the browser opens.

**Rationale:** Users expect CLI output from their command. The flag adds browser behavior rather than replacing terminal output.

## Risks / Trade-offs

- **Syntax divergence** — Our query syntax may not be 100% compatible with Scryfall's. → Acceptable: local results are authoritative, Scryfall page is best-effort visual supplement.
- **`scryfall_uri` staleness** — If Scryfall changes URL patterns, stored URIs could break. → Low risk: Scryfall URIs have been stable for years. Re-import would refresh them.
- **Re-import required** — Existing databases won't have `scryfall_uri` until re-imported. → The migration adds the column as nullable. `--open` on cards without the URI prints a message suggesting re-import.
- **Browser not available** — Headless/SSH environments may not have a browser. → `execFile` will fail silently or print an error. The CLI output is still shown regardless.
