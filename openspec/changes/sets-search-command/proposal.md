## Why

Users currently lack a convenient way to discover and search for MTG sets. The only reference is a static sets.md file. Being able to search sets by name, code, year, and type would make set discovery faster and support workflows like "find all sets from 2021" or "find Strixhaven variants".

## What Changes

- Add a new `sets` CLI subcommand that searches MTG sets using multiple criteria
- Create a `sets` database table to store set metadata (code, name, release year, set type)
- Extend the import process to extract set metadata from Scryfall bulk data
- Display results in a columnar format with smart type filtering (hide tokens/promos/memorabilia by default)
- Support positional argument with smart detection (4-digit number = year, short codes = code-first matching, else = name)
- Support `--year`, `--type`, and `--all` flags for explicit filtering and overrides

## Capabilities

### New Capabilities
- `sets-search`: CLI command to search MTG sets by name, code, year, or set type with smart term detection and filtering options

### Modified Capabilities
- `cli-commands`: Register the new `sets` subcommand in the CLI
- `data-import`: Extract `released_at` and `set_type` fields from Scryfall card objects and populate the sets table
- `database`: Add a new `sets` table with code, name, released_at, and set_type columns

## Impact

- New database migration (004-add-sets-table.sql)
- Importer changes to extract and deduplicate set metadata
- New CLI command file (src/cli/commands/sets.ts)
- New query function (searchSets in src/db/queries.ts)
- New data model type (SetRecord in src/models/)
- Updated CLI registration (src/cli/index.ts)
- New test coverage for sets command and query functions
