## 1. Shared Hydration Infrastructure

- [x] 1.1 Extract shared row-to-Card mapping helpers that can hydrate auxiliary data from grouped query results
- [x] 1.2 Add an internal batching path that loads colors, color identity, keywords, and legalities once per result set

## 2. Query Helper Migration

- [x] 2.1 Update `searchCards` and related multi-card helpers to use the set-based hydration path without changing returned `Card` objects
- [x] 2.2 Align single-card lookup helpers with the shared mapping rules so detail reads stay consistent with search results

## 3. Verification

- [x] 3.1 Add database tests that verify bounded auxiliary-query counts for multi-card result hydration
- [x] 3.2 Run the database and search test suites to confirm field completeness and unchanged caller behavior