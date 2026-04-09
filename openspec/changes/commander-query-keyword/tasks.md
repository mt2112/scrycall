## 1. Type and Model Changes

- [x] 1.1 Add `'commander'` to the `SearchField` union type in `src/models/query.ts`

## 2. Tokenizer

- [x] 2.1 Add `'commander': 'commander'` entry to `KEYWORD_MAP` in `src/parser/tokenizer.ts`
- [x] 2.2 Add tokenizer test: `commander:RG` produces keyword token with field `commander`, operator `:`, value `RG`

## 3. Query Builder

- [x] 3.1 Add `commander` case in `buildComparisonSql` in `src/search/query-builder.ts` that delegates to `buildColorQuery('colorIdentity', '<=', node.value)`
- [x] 3.2 Add query-builder test: `commander:RG` generates color identity subset SQL

## 4. Integration Tests

- [x] 4.1 Add search test: `commander:RG` returns cards with identity subset of {R, G} including colorless
- [x] 4.2 Add search test: `t:vehicle commander:RG` returns colorless and red/green Vehicles
- [x] 4.3 Add search test: `commander:gruul` works with color alias
