## 1. Model Types

- [x] 1.1 Add `SortField`, `SortDirection`, `SortOptions`, and `ParsedQuery` types to `src/models/query.ts`
- [x] 1.2 Add `order` and `direction` to the `SearchField` union type
- [x] 1.3 Add `orderBy` field to the `SqlQuery` interface in `src/search/query-builder.ts`

## 2. Tokenizer

- [x] 2.1 Add `order:` and `direction:` to the keyword prefix map in `src/parser/tokenizer.ts`
- [x] 2.2 Add tokenizer tests for `order:` and `direction:` keywords

## 3. Parser

- [x] 3.1 Update parser to intercept `order` and `direction` tokens, accumulate sort metadata, and return `ParsedQuery` instead of `QueryNode`
- [x] 3.2 Validate `order:` values against known sort field aliases and return `ParseError` for unknown fields
- [x] 3.3 Validate `direction:` values (only `asc` and `desc`) and return `ParseError` for invalid values
- [x] 3.4 Apply last-wins semantics for duplicate `order:` / `direction:` keywords
- [x] 3.5 Add parser tests: sort extraction, defaults, last-wins, invalid values, combined with filter terms

## 4. Query Builder

- [x] 4.1 Update `buildQuery()` to accept `ParsedQuery` and generate `orderBy` from sort options
- [x] 4.2 Implement sort field-to-SQL mapping (name, cmc, power, toughness, rarity, color, set) with NULL handling for power/toughness
- [x] 4.3 Add query builder tests for each sort field and direction combination

## 5. Search Layer

- [x] 5.1 Update `searchCards()` in `src/db/queries.ts` to append ORDER BY clause from `SqlQuery.orderBy`
- [x] 5.2 Update `search()` in `src/search/search.ts` to pass `ParsedQuery` to `buildQuery()`
- [x] 5.3 Add search integration tests verifying sorted results

## 6. Update Existing Tests

- [x] 6.1 Update existing parser tests to work with `ParsedQuery` return type (extract `.filter` from results)
- [x] 6.2 Update existing query builder tests to pass `ParsedQuery` to `buildQuery()`
- [x] 6.3 Update existing search tests for the new return structure
