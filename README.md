# Scrycall

Offline Magic: The Gathering card search CLI backed by SQLite.

Scrycall replicates the core search functionality of [Scryfall](https://scryfall.com) as a local command-line tool. Search your card collection offline using a familiar query syntax — no network access required after the initial data import.

## Features

- **Scryfall-like query syntax** — search by color, type, mana value, oracle text, keywords, and more
- **Offline-first** — all data stored locally in SQLite with FTS5 full-text search
- **Fast** — queries run against a local database, no API calls needed
- **Boolean logic** — combine filters with AND, OR, negation, and parentheses

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- npm

## Installation

```bash
git clone https://github.com/mt2112/scrycall.git
cd scrycall
npm install
```

## Build

```bash
npm run build
```

## Usage

### Import card data

Download and import the latest card data from the [Scryfall Bulk Data API](https://scryfall.com/docs/api/bulk-data):

```bash
npx scry import
```

Use `--force` to re-download even if data is recent:

```bash
npx scry import --force
```

### Search for cards

```bash
npx scry search "c:red t:creature pow>=4"
npx scry search "t:instant o:destroy mv<=2"
npx scry search "c:blue (t:instant or t:sorcery) o:draw"
```

### Look up a specific card

```bash
npx scry card "Lightning Bolt"
```

### Custom database path

Pass `--db <path>` to any command to use a specific database file:

```bash
npx scry search "t:goblin" --db ./my-cards.db
```

## Development

```bash
# Run directly without building (uses tsx)
npm run dev -- search "c:green t:elf"

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check
```

## Query Syntax

Scrycall supports a rich query language with field filters, comparison operators, boolean logic, and parenthetical grouping.

Quick examples:

```
c:red t:creature             # red creatures
mv>=3 pow>=4 f:modern        # modern-legal cards, 3+ mana value, 4+ power
t:instant or t:sorcery       # instants or sorceries
c:blue -kw:flying            # blue cards without flying
c:red (t:creature or t:instant)  # red creatures or red instants
```

See the full syntax reference: **[Query Syntax](query.md)**

## Reference

- [Query Syntax](query.md) — complete guide to search fields, operators, and boolean logic
- [Set Codes](sets.md) — all available set codes for `s:` queries
- [Keyword Abilities](keywords.md) — all keyword abilities for `kw:` queries

## Tech Stack

| Component        | Technology        |
|------------------|-------------------|
| Language         | TypeScript        |
| Runtime          | Node.js           |
| CLI Framework    | Commander.js      |
| Database         | SQLite (better-sqlite3) |
| Full-Text Search | SQLite FTS5       |
| Data Source      | Scryfall Bulk Data API |
| Testing          | Vitest            |
| Linting          | ESLint            |
| Formatting       | Prettier          |

## License

MIT
