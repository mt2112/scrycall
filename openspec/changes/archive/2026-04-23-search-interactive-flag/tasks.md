## 1. Add --interactive flag to search command

- [x] 1.1 Add `--interactive` / `-i` option to Commander command definition in `src/cli/commands/search.ts`
- [x] 1.2 Change branching logic: replace `process.stdout.isTTY` check with `options.interactive && process.stdout.isTTY`

## 2. Update tests

- [x] 2.1 Update `tests/cli/search-cli.test.ts` — default search output should be plain-text (no numbers), verify `-i` flag triggers numbered output
- [x] 2.2 Update `tests/cli/search-open.test.ts` — verify `--open` still works and takes precedence over `-i`
- [x] 2.3 Update `tests/cli/interactive-search.test.ts` — verify prompt loop only activates with `-i` flag

## 3. Update specs

- [x] 3.1 Archive spec changes into `openspec/specs/cli-commands/spec.md` and `openspec/specs/interactive-search/spec.md`
