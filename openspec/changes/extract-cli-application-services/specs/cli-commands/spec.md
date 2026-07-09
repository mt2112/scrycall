## ADDED Requirements

### Requirement: Command workflows delegate to reusable application services
Each CLI subcommand SHALL delegate its core workflow to a reusable application-service function that owns database-backed orchestration while the Commander handler remains responsible for argument parsing, process integration, and final rendering.

#### Scenario: Search command preserves behavior through a service boundary
- **WHEN** `scrycall search "c:red"` is run
- **THEN** the command handler delegates query execution and result selection to a reusable search workflow service while preserving the same stdout, stderr, exit-code, and interactive behavior defined for the command

#### Scenario: Import command preserves progress and summary behavior through a service boundary
- **WHEN** `scrycall import` is run
- **THEN** the command handler delegates import orchestration to a reusable import workflow service while preserving phase messages, failure handling, and final summary behavior

### Requirement: Command workflows remain programmatically testable without built binaries
The CLI layer SHALL expose command-workflow seams that can be exercised in tests without requiring a compiled `dist` executable for every behavior assertion.

#### Scenario: Search workflow can be tested without `dist` execution
- **WHEN** a test exercises the search command workflow programmatically
- **THEN** it can assert exit behavior, rendered output choices, and side-effect decisions without spawning the compiled CLI binary