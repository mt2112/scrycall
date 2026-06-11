## 1. Import Header Constants

- [x] 1.1 Add a shared import request headers constant in `src/import/fetch.ts` containing `User-Agent` and `Accept`.
- [x] 1.2 Update manifest fetch in `fetchBulkDataUri` to pass the required headers.

## 2. Apply Headers to Download Fetch

- [x] 2.1 Reuse the shared import header constant in `src/import/index.ts` for `fetch(downloadUri, ...)`.
- [x] 2.2 Keep existing import progress and error behavior unchanged.

## 3. Test Coverage

- [x] 3.1 Update `tests/import/run-import.test.ts` to assert required headers are sent in fetch options.
- [x] 3.2 Ensure existing phase-order assertions remain unchanged and passing.

## 4. Validation

- [x] 4.1 Run targeted import tests.
- [x] 4.2 Run full test suite if targeted tests pass.
