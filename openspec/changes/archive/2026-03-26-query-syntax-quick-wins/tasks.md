## 1. Model Types

- [x] 1.1 Add `loyalty`, `banned`, `restricted`, `powtou` to `SearchField` type union in `src/models/query.ts`
- [x] 1.2 Add `ExactNameNode` type (`{ kind: 'exactName'; value: string }`) to `QueryNode` union in `src/models/query.ts`
- [x] 1.3 Add `ExactNameToken` type (`{ kind: 'exactName'; value: string }`) to `Token` union in `src/models/query.ts`

## 2. Tokenizer Updates

- [x] 2.1 Add `and` keyword skip logic in `tokenize()` — skip word when lowercase matches `and` (same location as `or` check)
- [x] 2.2 Add `e` and `edition` entries to `KEYWORD_MAP` mapping to `set`
- [x] 2.3 Add `name` entry to `KEYWORD_MAP` mapping to `name`
- [x] 2.4 Add `banned` and `restricted` entries to `KEYWORD_MAP` mapping to `banned` and `restricted`
- [x] 2.5 Add `loyalty`, `loy` entries to `BARE_KEYWORD_MAP` mapping to `loyalty`
- [x] 2.6 Add `pt`, `powtou` entries to `BARE_KEYWORD_MAP` mapping to `powtou`
- [x] 2.7 Add `!` exact name prefix handling — emit `ExactNameToken` with bare word or quoted string value

## 3. Parser Updates

- [x] 3.1 Handle `ExactNameToken` in `parseAtom()` — create `ExactNameNode` AST node

## 4. Query Builder — New Field Handlers

- [x] 4.1 Add `loyalty` case to field dispatch — numeric handler same as power/toughness pattern (`CAST(loyalty AS REAL)`, exclude NULL and `*`)
- [x] 4.2 Add `banned` case to field dispatch — `EXISTS (SELECT 1 FROM card_legalities WHERE card_id = cards.id AND format = ? AND status = 'banned')`
- [x] 4.3 Add `restricted` case to field dispatch — same as banned but `status = 'restricted'`
- [x] 4.4 Add `powtou` case to field dispatch — `(CAST(power AS REAL) + CAST(toughness AS REAL)) [op] ?`, exclude NULL and `*` for both columns
- [x] 4.5 Add `exactName` node handler in `buildNodeSql` — `cards.name = ? COLLATE NOCASE`

## 5. Query Builder — Color Enhancements

- [x] 5.1 Add four-color aliases to `COLOR_ALIASES`: `chaos`→UBRG, `aggression`→WBRG, `altruism`→WURG, `growth`→WUBG, `artifice`→WUBR
- [x] 5.2 Add `multicolor`/`m` special value handling in `buildColorQuery` — `(SELECT COUNT(*) FROM card_colors/card_color_identity WHERE card_id = cards.id) > 1`

## 6. Query Builder — Enhanced Operators

- [x] 6.1 Add `mv:even`/`mv:odd` handling in mana value handler — check for `even`/`odd` string values before `parseFloat`, generate `CAST(cmc AS INTEGER) % 2 = 0/1`
- [x] 6.2 Add cross-field numeric comparison — in power, toughness, loyalty, mana value handlers, detect field reference values (`pow`, `power`, `tou`, `toughness`, `loy`, `loyalty`, `cmc`, `mv`) and generate column-to-column SQL

## 7. Unit Tests

- [x] 7.1 Add tokenizer tests: `and` skip, `e:`/`edition:` alias, `name:` keyword, `banned:`/`restricted:` keywords, `loy`/`loyalty` bare keyword, `pt`/`powtou` bare keyword, `!` exact name prefix
- [x] 7.2 Add parser tests: `ExactNameNode` parsing from `ExactNameToken`, `and` keyword produces correct AST
- [x] 7.3 Add query-builder tests: loyalty handler, banned/restricted handlers, powtou handler, exact name handler, four-color aliases, multicolor, mv:even/odd, pow>tou self-compare

## 8. Integration Tests

- [x] 8.1 Add integration tests in `search-complex.test.ts` with fixture cards: multicolor query, four-color alias, loyalty query, banned/restricted, combined pt, exact name, mv:even/odd, pow>tou
- [x] 8.2 Verify `and` keyword works in complex queries with fixture cards

## 9. Documentation

- [x] 9.1 Update `query.md` with all new syntax: `and` keyword, `e:`/`edition:`, four-color aliases, `c:multicolor`/`c:m`, `loyalty`/`loy`, `name:`, `!` exact name, `banned:`/`restricted:`, `pt`/`powtou`, `mv:even`/`mv:odd`, `pow>tou`
