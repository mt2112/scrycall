## 1. Project Scaffolding

- [x] 1.1 Create package.json with ESM config, dependencies (commander, better-sqlite3, stream-json), devDependencies (typescript, vitest, eslint, prettier, tsx, @types/better-sqlite3), bin entry, and scripts (build, dev, test, lint, format)
- [x] 1.2 Create tsconfig.json with strict mode, ESM module system, ES2022 target, outDir dist/
- [x] 1.3 Create .prettierrc and eslint.config.js configuration files
- [x] 1.4 Create vitest.config.ts
- [x] 1.5 Create directory structure: src/{cli,cli/commands,db,db/migrations,parser,models,import,search,output,utils} and tests/{parser,search,db,import,cli}
- [x] 1.6 Run npm install to verify dependencies resolve

## 2. Core Types and Models

- [x] 2.1 Create src/utils/result.ts — Result<T, E> type, ok() and err() constructor functions
- [x] 2.2 Create src/models/errors.ts — ParseError, ImportError, DbError types with kind discriminants
- [x] 2.3 Create src/models/card.ts — Card interface (all 17 fields), Color, Rarity, Legality, FormatLegality types
- [x] 2.4 Create src/models/query.ts — Token types, AST node types (AndNode, OrNode, NotNode, ComparisonNode, TextSearchNode), SearchField type, Operator type
- [x] 2.5 Create barrel exports: src/models/index.ts and src/utils/index.ts

## 3. Database Layer

- [x] 3.1 Create src/db/connection.ts — openDatabase(path?) function that opens/creates SQLite at configurable path, enables WAL mode and foreign keys
- [x] 3.2 Create src/db/migrations.ts — migration runner that reads versioned .sql files, tracks applied versions in _migrations table
- [x] 3.3 Create src/db/migrations/001-initial-schema.sql — cards table, card_colors, card_color_identity, card_keywords, card_legalities tables, FTS5 virtual table, indexes
- [x] 3.4 Create src/db/queries.ts — searchCards(db, sql, params), getCardByName(db, name) helpers that map rows to Card objects with joined array data
- [x] 3.5 Write tests/db/connection.test.ts — test database creation with in-memory SQLite, WAL mode, migration application
- [x] 3.6 Write tests/db/queries.test.ts — test query helpers with seeded in-memory database

## 4. Query Parser

- [x] 4.1 Create src/parser/tokenizer.ts — tokenize() function that splits query string into Token array, handling all keywords, operators, negation, quoted strings, parens, OR, bare words
- [x] 4.2 Create src/parser/parser.ts — parse() function using recursive descent that builds AST from tokens, AND precedence over OR, returns Result<QueryNode, ParseError>
- [x] 4.3 Create src/parser/index.ts — parseQuery(input) entry point combining tokenize + parse
- [x] 4.4 Write tests/parser/tokenizer.test.ts — test all keyword prefixes, operators, quoted strings, negation, parens, bare words, edge cases
- [x] 4.5 Write tests/parser/parser.test.ts — test AST structure for simple queries, AND/OR precedence, parentheses, negation, error cases (unmatched parens, empty query)

## 5. Search Engine

- [x] 5.1 Create src/search/query-builder.ts — buildQuery(ast) function that translates AST to { sql, params } with parameterized WHERE clauses
- [x] 5.2 Implement color/identity set operations in query builder — superset, subset, exact match via JOINs on card_colors/card_color_identity with HAVING COUNT logic
- [x] 5.3 Implement FTS5 text matching for oracle/name and LIKE matching for type queries
- [x] 5.4 Implement numeric comparisons for mana value, power, toughness (handle * as NULL)
- [x] 5.5 Implement rarity ordinal comparison (common < uncommon < rare < mythic)
- [x] 5.6 Implement format legality query via card_legalities JOIN
- [x] 5.7 Implement keyword ability query via card_keywords JOIN
- [x] 5.8 Implement AND/OR/NOT SQL composition
- [x] 5.9 Create src/search/search.ts — search(db, queryString) orchestrator returning Result<Card[], ParseError | DbError>
- [x] 5.10 Write tests/search/query-builder.test.ts — test SQL generation for each filter type, complex nested queries
- [x] 5.11 Write tests/search/search.test.ts — integration tests with seeded in-memory SQLite, verify end-to-end search results

## 6. Data Import

- [x] 6.1 Create src/import/fetch.ts — fetchBulkDataUri() that fetches Scryfall bulk data manifest and returns download URI for oracle_cards
- [x] 6.2 Create src/import/importer.ts — importCards(db, stream) that stream-parses JSON array, batches INSERTs in a single transaction, populates all auxiliary tables, rebuilds FTS5
- [x] 6.3 Create src/import/index.ts — runImport(db, options) orchestrator that fetches, downloads, and imports, returning Result<ImportStats, ImportError>
- [x] 6.4 Write tests/import/importer.test.ts — test importer with small fixture JSON, verify cards and auxiliary table data

## 7. Output Formatting

- [x] 7.1 Create src/output/card-formatter.ts — formatCardDetail(card) and formatCardList(cards) functions
- [x] 7.2 Create src/output/display.ts — printSearchResults(cards) and printCardDetail(card) that write to stdout with count summary

## 8. CLI Commands

- [x] 8.1 Create src/cli/index.ts — Commander.js program setup with version, description, register subcommands
- [x] 8.2 Create src/cli/commands/import.ts — import command with --force flag, calls runImport, displays progress and result
- [x] 8.3 Create src/cli/commands/search.ts — search command accepting query string, calls search(), displays results or parse error with position
- [x] 8.4 Create src/cli/commands/card.ts — card command accepting name, calls getCardByName, displays detail or not-found message
- [x] 8.5 Verify npm run build compiles successfully and scrycall --help works
