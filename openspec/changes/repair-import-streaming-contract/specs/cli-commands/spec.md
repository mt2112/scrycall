## ADDED Requirements

### Requirement: Import command rejects unsupported force behavior explicitly
The `import` command SHALL reject `--force` with an explanatory error until the application has a real freshness-metadata system that distinguishes a normal import from a forced import.

#### Scenario: Force flag is rejected explicitly
- **WHEN** `scrycall import --force` is run before freshness metadata support exists
- **THEN** the command exits with an error explaining that `--force` is not currently supported and instructs the user to run `scrycall import` without the flag