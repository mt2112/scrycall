## 1. Service Boundaries

- [x] 1.1 Define reusable application-service entry points for search, card lookup, import, and sets command workflows
- [x] 1.2 Move database lifecycle and command orchestration into those workflow services while keeping existing rendering helpers intact

## 2. Commander Adapter Simplification

- [x] 2.1 Refactor Commander command handlers to delegate to the workflow services and preserve current stdout, stderr, exit-code, and side-effect behavior
- [x] 2.2 Keep interactive prompt and browser-opening behavior explicit at the service boundary so command ordering remains unchanged

## 3. Verification

- [x] 3.1 Add programmatic CLI tests that cover workflow results without relying exclusively on compiled `dist` execution
- [x] 3.2 Retain or update a smaller set of end-to-end CLI tests as smoke coverage for the wired command surface