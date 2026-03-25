# Scrycall — AI Agent Context

## Project Overview

Scrycall is a command-line tool for querying Magic: The Gathering card data offline. It replicates the core search functionality of [Scryfall](https://scryfall.com) as a local CLI utility backed by a SQLite database. The primary use case is offline card search without depending on network access.

## Tech Stack

| Component         | Technology                  |
| ----------------- | --------------------------- |
| Language          | TypeScript (strict mode)    |
| Module System     | ESM (`"type": "module"`)    |
| Runtime           | Node.js                     |
| CLI Framework     | Commander.js                |
| Database          | SQLite via better-sqlite3   |
| Full-Text Search  | SQLite FTS5                 |
| Data Source       | Scryfall Bulk Data API      |
| Testing           | Vitest                      |
| Linting           | ESLint                      |
| Formatting        | Prettier                    |
| Package Manager   | npm                         |

## Project Structure

```
scrycall/
├── src/
│   ├── cli/            # Commander.js command definitions and entry point
│   ├── db/             # SQLite database setup, migrations, and query helpers
│   ├── parser/         # Scryfall-like query syntax tokenizer and parser
│   ├── models/         # TypeScript types/interfaces for card data
│   ├── import/         # Bulk data download and database import logic
│   ├── search/         # Search engine: bridges parsed queries to SQL
│   ├── output/         # Card formatting and terminal display
│   └── utils/          # Shared utility functions
├── tests/              # Test files mirroring src/ structure
├── agent.md            # This file — AI agent context
├── package.json
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
└── vitest.config.ts
```

## Architecture

### Design Principles

- **Functional style** — No classes. Use pure functions, composition, and modules.
- **Explicit types** — Never use `any`. Define precise types for all data structures.
- **Result types for errors** — Functions return `Result<T, E>` instead of throwing exceptions:
  ```typescript
  type Result<T, E = Error> =
    | { ok: true; data: T }
    | { ok: false; error: E };
  ```
- **Named exports only** — No default exports.
- **Synchronous database access** — better-sqlite3 is synchronous by design, which is appropriate for a CLI tool. No async/await needed for DB operations.

### Data Flow

```
User Input (query string)
  → Parser (tokenize + parse into AST)
  → Search Engine (AST → SQL query)
  → Database (execute query via better-sqlite3)
  → Output Formatter (format results for terminal)
  → stdout
```

### Database Design

- SQLite database stored locally (default: `~/.scrycall/cards.db`)
- Main `cards` table with columns mapped from Scryfall card objects
- FTS5 virtual table for full-text search on `name`, `oracle_text`, and `type_line`
- Auxiliary tables for array fields: `card_colors`, `card_color_identity`, `card_keywords`, `card_legalities`
- Migrations managed as versioned SQL files in `src/db/migrations/`

## Data Source

Card data comes from the **Scryfall Bulk Data API**.

- **Endpoint:** `GET https://api.scryfall.com/bulk-data`
- **Data file:** Use the `oracle_cards` type (one card per Oracle ID, ~162 MB JSON)
- **Update frequency:** Scryfall updates bulk data every 12 hours. Weekly imports are sufficient for gameplay data.
- **Import flow:**
  1. Fetch bulk data manifest from `/bulk-data`
  2. Download the `oracle_cards` JSON file from the `download_uri`
  3. Stream-parse the JSON array
  4. Insert/upsert rows into SQLite within a transaction

### Key Card Fields (from Scryfall schema)

| Field              | Type       | Description                                    |
| ------------------ | ---------- | ---------------------------------------------- |
| `id`               | UUID       | Scryfall unique ID                             |
| `oracle_id`        | UUID       | Oracle identity (shared across printings)      |
| `name`             | string     | Card name                                      |
| `mana_cost`        | string     | Mana cost string, e.g. `{2}{W}{U}`            |
| `cmc`              | number     | Converted mana cost / mana value               |
| `type_line`        | string     | Full type line, e.g. `Legendary Creature — Elf`|
| `oracle_text`      | string     | Rules text                                     |
| `power`            | string     | Power (creatures only, may be `*`)             |
| `toughness`        | string     | Toughness (creatures only, may be `*`)         |
| `colors`           | string[]   | Card colors: `W`, `U`, `B`, `R`, `G`          |
| `color_identity`   | string[]   | Commander color identity                       |
| `keywords`         | string[]   | Keyword abilities                              |
| `set`              | string     | Set code, e.g. `neo`                           |
| `set_name`         | string     | Full set name                                  |
| `rarity`           | string     | `common`, `uncommon`, `rare`, `mythic`         |
| `legalities`       | object     | Format legality map                            |
| `loyalty`          | string     | Planeswalker starting loyalty                  |

## Core Commands

### `scrycall import`

Download and import Scryfall bulk data into the local SQLite database.

```bash
scrycall import              # Download oracle cards and populate DB
scrycall import --force      # Re-download even if data is recent
```

### `scrycall search <query>`

Search for cards using Scryfall-like query syntax.

```bash
scrycall search "c:red t:creature pow>=4"
scrycall search "t:instant f:modern o:draw"
scrycall search "lightning bolt"
```

### `scrycall card <name>`

Display detailed information for a specific card.

```bash
scrycall card "Lightning Bolt"
scrycall card "Thalia, Guardian of Thraben"
```

## Query Syntax (Core Subset)

The parser implements a core subset of [Scryfall's search syntax](https://scryfall.com/docs/syntax):

| Keyword      | Description                          | Example                     |
| ------------ | ------------------------------------ | --------------------------- |
| `c:` / `color:` | Card colors                       | `c:red`, `c:uw`, `c>=rg`   |
| `id:` / `identity:` | Color identity                | `id:temur`, `id<=wub`       |
| `t:` / `type:` | Card type, supertype, or subtype  | `t:creature`, `t:legendary` |
| `o:` / `oracle:` | Oracle/rules text              | `o:draw`, `o:"enters tapped"` |
| `m:` / `mana:` | Mana cost symbols                | `m:{W}{U}`, `m:2RR`        |
| `mv` / `manavalue` | Mana value (CMC)             | `mv=3`, `mv>=5`            |
| `pow` / `power` | Power                           | `pow>=4`, `pow>tou`        |
| `tou` / `toughness` | Toughness                    | `tou<=2`                   |
| `r:` / `rarity:` | Rarity                         | `r:mythic`, `r>=rare`      |
| `s:` / `set:` | Set code                          | `s:neo`, `s:mkm`           |
| `f:` / `format:` | Format legality                | `f:modern`, `f:standard`   |
| `kw:` / `keyword:` | Keyword ability              | `kw:flying`, `kw:deathtouch` |
| (bare text)  | Name search                        | `lightning bolt`            |

### Operators

| Operator | Meaning                    | Example          |
| -------- | -------------------------- | ---------------- |
| `:`/`=`  | Equals / includes          | `c:red`          |
| `>`      | Greater than               | `mv>3`           |
| `<`      | Less than                  | `pow<2`          |
| `>=`     | Greater than or equal      | `cmc>=4`         |
| `<=`     | Less than or equal         | `tou<=3`         |
| `!=`     | Not equal                  | `r!=common`      |
| `-`      | Negate condition (prefix)  | `-t:creature`    |
| `or`/`OR`| Boolean OR between terms   | `t:elf or t:goblin` |
| `(` `)`  | Group conditions           | `t:legendary (t:elf or t:goblin)` |
| `" "`    | Quoted phrase              | `o:"draw a card"` |

### Parser Architecture

The parser has two stages:
1. **Tokenizer** — Splits raw query string into tokens (keywords, operators, values, parentheses, bare words)
2. **Parser** — Builds an AST from the token stream with proper precedence (AND binds tighter than OR, parentheses override)

The AST is then transformed by the search engine into parameterized SQL queries.

## Coding Conventions

### TypeScript

- Strict mode enabled in `tsconfig.json` (`"strict": true`)
- ESM: use `import`/`export`, include `.js` extensions in relative import paths
- Prefer `const` over `let`; never use `var`
- Use `readonly` for data that should not be mutated
- Prefer `interface` for object shapes, `type` for unions and computed types
- Function signatures must have explicit return types

### Functions

- Prefer small, focused, pure functions
- Side-effectful functions (DB access, file I/O, network) should be clearly separated from pure logic
- Use descriptive names: `parseQuery`, `buildSearchSql`, `formatCardDetail`
- Avoid deeply nested logic; extract helper functions early

### Error Handling

- Use `Result<T, E>` pattern throughout — never throw for expected errors
- Reserve thrown exceptions for truly unexpected/programmer errors
- Define specific error types per domain:
  ```typescript
  type ParseError = { kind: "parse"; message: string; position: number };
  type ImportError = { kind: "import"; message: string; cause?: Error };
  type DbError = { kind: "db"; message: string; cause?: Error };
  ```

### Naming

- Files: `kebab-case.ts` (e.g., `query-parser.ts`, `card-formatter.ts`)
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` for true constants, `camelCase` for derived values

### Testing

- Test files: `tests/<module>/<name>.test.ts` mirroring `src/` structure
- Prefer unit tests for parser and search query builder (pure functions)
- Use in-memory SQLite databases for DB integration tests
- Aim for high coverage on the parser and search modules

## Development Commands

```bash
npm run build       # Compile TypeScript to dist/
npm run dev         # Run in development mode (tsx)
npm test            # Run test suite with Vitest
npm run test:watch  # Run Vitest in watch mode
npm run lint        # Run ESLint
npm run lint:fix    # Run ESLint with auto-fix
npm run format      # Run Prettier
npm run format:check # Check Prettier formatting
```

## External API Reference

### Scryfall Bulk Data

- **API Docs:** https://scryfall.com/docs/api/bulk-data
- **Endpoint:** `GET https://api.scryfall.com/bulk-data`
- **Card Schema:** https://scryfall.com/docs/api/cards
- **Search Syntax:** https://scryfall.com/docs/syntax
- **Rate Limits:** Scryfall asks for 50-100ms delay between requests; bulk data downloads are not rate-limited
- **License:** Scryfall data is free to use per their terms. Card imagery and mana symbols are copyright Wizards of the Coast.

## Notes for AI Agents

- When implementing the parser, refer to the Query Syntax section above for the supported keyword/operator combinations.
- The `better-sqlite3` API is synchronous — do not wrap DB calls in `async`/`await`.
- Scryfall's bulk data `oracle_cards` file is a JSON array (not JSONL). For large imports, use a streaming JSON parser (e.g., `stream-json`) to avoid loading the entire file into memory.
- Color comparisons in Scryfall use set logic: `c>=rg` means "colors are a superset of red and green." Implement color matching as set operations.
- Mana value (`mv`/`cmc`) is numeric. Power and toughness may contain `*` — handle non-numeric stats gracefully.
- The `legalities` field from Scryfall is an object mapping format names to `"legal"`, `"not_legal"`, `"banned"`, or `"restricted"`. Store as a normalized table.
