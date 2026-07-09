## 1. Query Builder Seams

- [x] 1.1 Introduce a per-build query-compilation context to replace module-global join allocation state
- [x] 1.2 Extract sort generation and shared SQL assembly into dedicated internal helpers without changing the `buildQuery` API

## 2. Condition and Field Builders

- [x] 2.1 Extract condition dispatch for `is:`, `not:`, and `has:` into dedicated internal modules
- [x] 2.2 Extract field comparison builders and boolean-composition helpers while preserving current query semantics

## 3. Parity Verification

- [x] 3.1 Update or add query-builder tests covering compound queries, OR/NOT join isolation, and explicit sort behavior after modularization
- [x] 3.2 Run the search-related test suites to confirm the modular builder preserves existing behavior