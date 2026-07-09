## ADDED Requirements

### Requirement: Migration assets fail fast when unavailable
Database initialization SHALL fail immediately when the migration directory or required migration files are unavailable, rather than silently skipping migration discovery.

#### Scenario: Missing migration directory stops startup
- **WHEN** the application starts and the migration directory cannot be read
- **THEN** database initialization fails with an explicit error before any command attempts normal database queries

#### Scenario: Mispackaged build surfaces startup failure
- **WHEN** a packaged build omits migration assets
- **THEN** the application reports the missing migration assets during startup instead of failing later with missing-table query errors