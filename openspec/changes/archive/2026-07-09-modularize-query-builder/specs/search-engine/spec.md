## ADDED Requirements

### Requirement: Query compilation remains deterministic across modular builders
The search engine SHALL compile supported queries through modular internal builder components while preserving the same filtering, join-isolation, parameterization, and sort semantics exposed by the existing `buildQuery` boundary.

#### Scenario: Compound query preserves filtering semantics
- **WHEN** the query is `c:red (t:creature or t:instant) -kw:flying`
- **THEN** the compiled SQL preserves the same logical grouping and matching behavior as the pre-refactor query builder

#### Scenario: Explicit sort preserves ordering semantics
- **WHEN** the query is `c:red order:power direction:desc`
- **THEN** the compiled SQL preserves the same ORDER BY behavior and parameterization as the pre-refactor query builder

### Requirement: Query compilation state is scoped per build
The search engine SHALL scope join-allocation and alias-generation state to a single query compilation so one build cannot affect the SQL produced for another build.

#### Scenario: Consecutive builds do not leak alias state
- **WHEN** two queries requiring generated joins are compiled sequentially
- **THEN** the second query starts from a clean join-allocation state and produces the same SQL shape it would produce in isolation