## Why

Scrycall does not exist yet. Magic: The Gathering players and developers need a way to query card data offline without depending on network access to Scryfall. A local CLI tool backed by SQLite would provide fast, reliable card search with the familiar Scryfall query syntax.

## What Changes

- Create a new TypeScript CLI application from scratch
- Implement Scryfall-compatible query syntax parser (keywords: color, type, oracle text, mana value, power/toughness, rarity, set, format, keyword ability, color identity)
- Build SQLite database layer with FTS5 full-text search for name, oracle text, and type line
- Implement bulk data import from Scryfall Bulk Data API using streaming JSON parser
- Create three CLI commands: `import` (download/update data), `search` (query cards), `card` (single card lookup)
- Implement terminal output formatting for card display

## Capabilities

### New Capabilities

- `project-setup`: Project scaffolding — package.json (ESM), tsconfig.json (strict), vitest, eslint, prettier configs, directory structure
- `core-types`: Result type pattern, error types (ParseError, ImportError, DbError), Card interface, parser AST types
- `database`: SQLite connection management (WAL mode), migration system, initial schema (cards table, auxiliary tables for colors/keywords/legalities, FTS5 virtual table), query helpers
- `query-parser`: Tokenizer and recursive-descent parser for Scryfall-like query syntax — keywords, operators, negation, quoted phrases, boolean OR, parenthetical grouping
- `search-engine`: AST-to-SQL translator with color set operations, FTS5 text matching, numeric comparisons, rarity ordering, format legality joins; search orchestrator function
- `data-import`: Scryfall Bulk Data API client (fetch manifest, download oracle_cards), streaming JSON importer with batched transactions and auxiliary table population
- `output-formatting`: Card detail and list formatters for terminal display, stdout helpers with optional color support
- `cli-commands`: Commander.js entry point with `import`, `search`, and `card` commands; bin entry for global install

### Modified Capabilities

_None — greenfield project._

## Impact

- **New files**: ~25 source files across `src/` subdirectories, ~5 test directories, 6 config files at root
- **Dependencies**: commander, better-sqlite3, stream-json (runtime); typescript, vitest, eslint, prettier, tsx, @types/better-sqlite3 (dev)
- **External API**: Scryfall Bulk Data API (read-only, bulk download during import only)
- **Local storage**: SQLite database at `~/.scrycall/cards.db` (~50 MB after import)
