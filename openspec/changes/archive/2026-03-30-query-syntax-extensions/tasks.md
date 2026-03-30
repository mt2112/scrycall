## 1. Core Types

- [x] 1.1 Add `'is' | 'not' | 'has'` to the `SearchField` type union in `src/models/query.ts`

## 2. Tokenizer

- [x] 2.1 Add `is`, `not`, and `has` entries to `KEYWORD_MAP` in `src/parser/tokenizer.ts`
- [x] 2.2 Add tokenizer tests for `is:spell`, `not:spell`, `has:loyalty`, `-not:spell`, and `is:` with quoted values

## 3. Strixhaven College Color Aliases

- [x] 3.1 Add `silverquill`, `prismari`, `witherbloom`, `lorehold`, `quandrix` to `COLOR_ALIASES` in `src/search/query-builder.ts`
- [x] 3.2 Add tests for college aliases in color and color identity queries

## 4. Numeric Color Count

- [x] 4.1 Extend `buildColorQuery` in `src/search/query-builder.ts` to detect numeric values and generate `COUNT`-based SQL with `GROUP BY`/`HAVING`
- [x] 4.2 Apply the same numeric count logic in `buildColorIdentityQuery` (or the shared color query builder)
- [x] 4.3 Add tests for `c=2`, `c>=3`, `c=0`, `id=2`

## 5. is: Condition Framework

- [x] 5.1 Create `IS_CONDITIONS` dispatch map in `src/search/query-builder.ts` mapping condition names to SQL builder functions
- [x] 5.2 Add `buildIsQuery` function that looks up conditions and returns SQL (returns `1 = 0` for unknown conditions)
- [x] 5.3 Add `buildNotQuery` function that negates the corresponding `is:` condition SQL
- [x] 5.4 Wire `is`, `not` fields into the main `buildQuery` switch/dispatch in `src/search/query-builder.ts`

## 6. is: Condition Implementations

- [x] 6.1 Implement `is:spell` — type_line NOT LIKE '%Land%'
- [x] 6.2 Implement `is:permanent` — type_line matches creature/artifact/enchantment/planeswalker/land/battle
- [x] 6.3 Implement `is:historic` — type_line matches legendary/artifact/saga
- [x] 6.4 Implement `is:vanilla` — creature with NULL/empty oracle_text
- [x] 6.5 Implement `is:modal` — oracle_text contains "choose one/two/three" patterns
- [x] 6.6 Implement `is:bear` — creature, power=2, toughness=2, cmc=2
- [x] 6.7 Implement `is:hybrid` — mana_cost matches hybrid symbol pattern `{X/Y}`
- [x] 6.8 Implement `is:phyrexian` — mana_cost matches Phyrexian symbol pattern `{X/P}`
- [x] 6.9 Implement `is:party` — creature with cleric/rogue/warrior/wizard subtype
- [x] 6.10 Implement `is:outlaw` — creature with assassin/mercenary/pirate/rogue/warlock subtype
- [x] 6.11 Add tests for each is: condition with positive and negative match cases

## 7. has: Conditions

- [x] 7.1 Create `HAS_CONDITIONS` dispatch map and `buildHasQuery` function
- [x] 7.2 Implement `has:pt` — power IS NOT NULL AND toughness IS NOT NULL
- [x] 7.3 Implement `has:loyalty` — loyalty IS NOT NULL
- [x] 7.4 Wire `has` field into the main `buildQuery` dispatch
- [x] 7.5 Add tests for has: conditions

## 8. Integration Tests

- [x] 8.1 Add end-to-end search tests combining `is:`/`not:`/`has:` with existing query features (colors, types, OR/AND/NOT)
- [x] 8.2 Add search tests for numeric color count combined with other conditions
- [x] 8.3 Verify all existing tests still pass
