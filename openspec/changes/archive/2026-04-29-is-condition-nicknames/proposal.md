## Why

ScryCall supports `is:` conditions for filtering cards (spell, permanent, vanilla, etc.) but is missing the most commonly used Scryfall nicknames — land cycle names (`is:fetchland`, `is:dual`, `is:shockland`, etc.) and commander/format conditions (`is:commander`, `is:partner`, `is:companion`). These are among the most frequently used queries on Scryfall and are conspicuously absent. Additionally, multi-face card queries (`is:split`, `is:dfc`, `is:mdfc`, `is:transform`) are impossible because the `layout` field is not imported.

The current `IS_CONDITIONS` dict works well for simple type-line/oracle-text checks, but land nicknames require complex multi-pattern oracle text heuristics that are expensive at query time and awkward to express in SQL. A pre-tagging approach — computing derived tags at import time and storing them in a `card_tags` table — makes queries fast (indexed JOIN) and tag rules easy to write (JavaScript predicates on raw card data).

## What Changes

- Add `layout` column to cards table (imported from Scryfall bulk JSON)
- Add `card_tags` join table for pre-computed is: condition tags
- New `src/import/tagger.ts` module with pure-function tag rules evaluated at import time
- Importer calls tagger for each card and populates `card_tags`
- Query builder falls through to `card_tags` table for `is:` conditions not in the hardcoded dict
- Alias map resolves alternate names (e.g., `cycleland` → `bikeland`, `karoo` → `bounceland`)

### New `is:` conditions — Land nicknames

`dual`, `fetchland`, `shockland`, `checkland`, `fastland`, `slowland`, `painland`, `gainland`, `scryland`, `bounceland` (alias `karoo`), `bikeland` (aliases `cycleland`, `bicycleland`), `triome` (aliases `trikeland`, `tricycleland`), `tangoland` (alias `battleland`), `bondland` (aliases `crowdland`, `bbdland`), `canopyland` (alias `canland`), `shadowland` (alias `snarl`), `filterland`, `storageland`, `surveilland`, `manland` (alias `creatureland`), `pathway`

### New `is:` conditions — Commander/format

`commander`, `partner`, `companion`, `brawler`, `oathbreaker`

### New `is:` conditions — Multi-face (via layout column)

`split`, `flip`, `transform` (alias `tdfc`), `dfc`, `mdfc`, `meld`, `leveler`

## Capabilities

### New Capabilities
- `card-tagging`: Pre-computed card tag system — JavaScript predicate rules evaluated at import time, stored in `card_tags` table, queried via indexed JOIN

### Modified Capabilities
- `is-conditions`: Extended with ~30 land nicknames, ~5 commander conditions, ~7 multi-face conditions, plus alias resolution
- `data-import`: Importer extracts `layout` field from Scryfall JSON; calls tagger module to compute and insert tags
- `database`: New migration adds `layout` column and `card_tags` table with index
- `search-engine`: `buildIsQuery` falls through to `card_tags` table for conditions not in hardcoded dict

## Impact

- **Database**: Migration 003 adds `layout TEXT` column to `cards`, creates `card_tags (card_id, tag)` table with index on `tag`
- **Importer**: Extracts `layout` field; after inserting a card, calls tagger to compute tags and inserts into `card_tags`; `ScryfallCard` interface gains `layout` field
- **Tagger (new)**: Pure-function tag rules — each is `(card) => boolean`. Evaluated per card at import time. ~35 rules total.
- **Query builder**: `buildIsQuery` checks `IS_CONDITIONS` dict first (existing runtime conditions stay), then falls through to `card_tags` EXISTS query. New `TAG_ALIASES` map resolves alternate names before lookup.
- **IS_CONDITIONS dict**: Gains layout-based entries (`split`, `dfc`, etc.) as simple column checks
- **Tests**: New tagger unit tests (mock card objects, no DB needed), updated query-builder tests for tag fallthrough, integration tests for land/commander queries
