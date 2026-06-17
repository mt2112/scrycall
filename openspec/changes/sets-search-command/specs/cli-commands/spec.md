## MODIFIED Requirements

### Requirement: CLI entry point with Commander.js
The system SHALL provide a CLI entry point using Commander.js that registers `import`, `search`, `card`, and `sets` subcommands. The package.json `bin` field SHALL point to the compiled entry point.

#### Scenario: Help output
- **WHEN** `scrycall --help` is run
- **THEN** it displays available commands: import, search, card, sets

### Requirement: Sets command searches MTG sets
The `sets` command SHALL accept a positional argument and optional flags to search for MTG sets. The command SHALL support `--year`, `--type`, and `--all` flags. When no arguments are provided, the command SHALL display help text.

#### Scenario: Sets command help
- **WHEN** `scrycall sets --help` is run
- **THEN** it displays the sets command syntax and available flags

#### Scenario: Sets command with search term
- **WHEN** `scrycall sets strixhaven` is run in a TTY environment
- **THEN** matching sets are displayed in columnar format
