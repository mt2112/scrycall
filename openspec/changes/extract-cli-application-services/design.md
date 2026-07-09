## Context

The current command handlers in `src/cli/commands` bind Commander arguments, open databases, orchestrate use cases, decide output behavior, and trigger side effects like browser opening. Those mixed responsibilities make behavior preservation harder to verify and encourage end-to-end tests where narrower service tests would be enough.

## Goals / Non-Goals

**Goals:**
- Preserve existing command-line behavior while moving orchestration into reusable service functions
- Leave Commander responsible for argument parsing and shell integration only
- Create test seams for command workflows without depending exclusively on built `dist` binaries
- Normalize how command flows represent success, failure, side effects, and output decisions

**Non-Goals:**
- Adding new CLI flags or changing output formatting rules
- Replacing Commander.js
- Reworking search or import internals beyond what command-service extraction needs

## Decisions

### 1. Introduce application services per command workflow

Search, card lookup, import, and sets workflows should each expose a focused service-level function that returns structured results. Commander handlers become adapters that bind args, call the service, and render outcomes.

### 2. Preserve side-effect ordering explicitly

The service boundary should make browser-opening, interactive prompts, and output decisions explicit so command behavior remains consistent even after the handler logic is thinned out.

### 3. Build a programmatic test harness around the command services

Behavior that currently requires `execFileSync` against built output should become verifiable through service-level and program-level tests. Keep a smaller number of end-to-end binary tests as smoke coverage.

## Risks / Trade-offs

- **[Too much indirection]** → New service layers can obscure simple flows. Mitigation: create one service per command workflow rather than a generic abstraction tower.
- **[Behavior drift in stderr/stdout handling]** → Small differences are easy to miss. Mitigation: represent output intents explicitly and preserve the current rendering functions.
- **[Interactive flow becomes harder to follow]** → Splitting the prompt loop from command registration can hide control flow. Mitigation: keep prompt orchestration close to the interactive search service.

## Migration Plan

1. Define service entry points for search, card, import, and sets workflows.
2. Move database lifecycle and use-case orchestration behind those service functions.
3. Update Commander handlers to become thin adapters.
4. Add programmatic CLI tests for exit codes, output paths, and side-effect decisions.

## Open Questions

- Whether the interactive prompt loop should remain in the command module or move entirely into the search service
- Whether a shared command-context object is useful or unnecessary at this scale