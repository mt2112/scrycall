# Oracle Tags Implementation Tasks

## Status: ✅ COMPLETE (46/46 tasks)

**Test Results**: 418 tests passing (26 new tests added)
- 14 Oracle tags import tests
- 12 Oracle tags query builder tests
- 7 Oracle tags integration tests
- 385 existing tests (no regressions)

---

## 1. Database Schema & Migrations

- [x] 1.1 Create migration file for oracle_tags table
- [x] 1.2 Create migration file for oracle_taggings table
- [x] 1.3 Add indexes on oracle_taggings (oracle_id, tag_id)
- [x] 1.4 Run migrations locally and verify schema

## 2. Oracle Tags Data Import

- [x] 2.1 Implement oracle tags bulk file download in importer
- [x] 2.2 Add JSONL parsing for oracle tags format
- [x] 2.3 Build DAG graph structure from parent_ids/child_ids
- [x] 2.4 Implement transitive closure computation for descendants
- [x] 2.5 Add cycle detection and logging for DAG
- [x] 2.6 Implement batch insert for oracle_tags records
- [x] 2.7 Implement batch insert for oracle_taggings records
- [x] 2.8 Add import error handling (non-blocking failure)
- [x] 2.9 Add import logging and statistics output
- [x] 2.10 Test with real oracle tags bulk file (1,001 tags)

## 3. Query Parser & Tokenizer

- [x] 3.1 Add `otag` keyword to tokenizer KEYWORD_MAP
- [x] 3.2 Verify tokenizer recognizes `otag:` as keyword operator
- [x] 3.3 Test tokenizer with various otag formats (otag:ramp, otag!=ramp, -otag:removal)
- [x] 3.4 Verify parser builds correct AST nodes for otag operators
- [x] 3.5 Test parser with complex queries (otag:ramp and c:green or otag:draw)

## 4. Search Engine Query Builder

- [x] 4.1 Implement `buildOtagQuery()` function in field-builders.ts
- [x] 4.2 Load oracle_tags and retrieve cached_descendants_json
- [x] 4.3 Expand tag to descendants list
- [x] 4.4 Build SQL EXISTS clause for oracle_taggings query
- [x] 4.5 Add weight filtering (default strong+)
- [x] 4.6 Add case to query builder dispatcher for oracleTag field
- [x] 4.7 Test single tag queries (otag:ramp)
- [x] 4.8 Test parent tag queries (otag:removal expands to descendants)
- [x] 4.9 Test negation queries (not otag:ramp)
- [x] 4.10 Test combined operators (otag:ramp and c:green)

## 5. Integration Testing

- [x] 5.1 Write unit tests for DAG traversal and transitive closure
- [x] 5.2 Write unit tests for oracle tags import (batch insert, error handling)
- [x] 5.3 Write unit tests for query builder (descendants expansion, weight filtering)
- [x] 5.4 Write integration test: full import → query → results
- [x] 5.5 Performance test: measure query latency on real tags (goal: <5ms)
- [x] 5.6 Test edge cases: leaf tags, parent-only tags, multi-parent tags
- [x] 5.7 Test cycle detection (defensive test with mock cyclic data)

## 6. Documentation & Examples

- [x] 6.1 Add otag: operator to syntax guide / README
- [x] 6.2 Document query examples (otag:ramp, otag:removal, otag!=removal)
- [x] 6.3 Document weight filtering behavior (strong+ default)
- [x] 6.4 Document tag hierarchy and how queries expand
- [x] 6.5 Add oracle tags to help/man pages

## 7. Validation & Cleanup

- [x] 7.1 Run full test suite (existing tests + new tests)
- [x] 7.2 Verify no breaking changes to existing query syntax
- [x] 7.3 Test with multiple query combinations for regressions
- [x] 7.4 Clean up temporary oracle tags bulk file from root (oracle-tags-*.jsonl)
- [x] 7.5 Final sanity check: import → query → results end-to-end
