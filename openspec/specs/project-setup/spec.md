## ADDED Requirements

### Requirement: Project uses ESM with TypeScript strict mode
The project SHALL use `"type": "module"` in package.json and TypeScript with `strict: true` targeting ES2022. All relative imports SHALL use `.js` extensions.

#### Scenario: TypeScript compilation succeeds
- **WHEN** `npm run build` is executed
- **THEN** the project compiles with zero errors and outputs to `dist/`

### Requirement: Project defines all runtime dependencies
The project SHALL declare `commander`, `better-sqlite3`, and `stream-json` as runtime dependencies in package.json.

#### Scenario: Dependencies are installable
- **WHEN** `npm install` is run in a clean environment
- **THEN** all runtime and dev dependencies install without errors

### Requirement: Project provides standard development scripts
The project SHALL define `build`, `dev`, `test`, `lint`, `lint:fix`, `format`, and `format:check` scripts in package.json.

#### Scenario: Build script compiles TypeScript
- **WHEN** `npm run build` is executed
- **THEN** TypeScript files are compiled to JavaScript in `dist/`

#### Scenario: Test script runs Vitest
- **WHEN** `npm test` is executed
- **THEN** Vitest runs all test files matching `tests/**/*.test.ts`

### Requirement: Source directory structure follows module layout
The project SHALL organize source code into `src/cli`, `src/db`, `src/parser`, `src/models`, `src/import`, `src/search`, `src/output`, and `src/utils` directories.

#### Scenario: Directory structure exists after scaffolding
- **WHEN** the project is scaffolded
- **THEN** all eight `src/` subdirectories exist
