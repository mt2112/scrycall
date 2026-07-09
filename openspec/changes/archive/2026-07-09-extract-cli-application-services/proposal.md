## Why

The CLI command handlers currently combine argument binding, database lifecycle, output policy, browser side effects, and use-case orchestration in the same functions. That makes command behavior harder to test and reuse, so the CLI layer needs a requirement that observable command behavior be driven through reusable application services rather than command-specific control flow.

## What Changes

- Add a CLI requirement that command execution be delegated to reusable application-service functions while preserving existing stdout, stderr, exit code, and interactive behavior
- Define stable seams for search, card lookup, import, and sets workflows so Commander remains a thin shell
- Add coverage requirements for programmatic command execution paths to reduce dependence on `dist`-level process tests alone

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-commands`: Add requirements for reusable command orchestration services that preserve existing command behavior and side-effect ordering

## Impact

- Affected code: `src/cli/commands/*.ts`, command wiring, CLI tests
- Affected systems: command execution flow, interactive search, browser-opening paths, import orchestration
- Compatibility: no command-line syntax changes and no intended behavior changes for existing commands