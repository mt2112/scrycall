## Context

Import currently performs two HTTP requests in sequence: fetching the bulk-data manifest from `https://api.scryfall.com/bulk-data` and downloading the Oracle Cards payload from the returned `download_uri`. These requests are made without explicit `User-Agent` and `Accept` headers.

Scryfall requires both headers on API requests and recommends an application-identified `User-Agent`. Missing headers can produce HTTP 400 responses and prevent import from starting.

## Goals / Non-Goals

**Goals:**
- Ensure import HTTP requests always include Scryfall-required headers.
- Use app name `scrycall` in `User-Agent` and include `Accept` explicitly.
- Keep behavior and control flow unchanged outside request options.
- Add regression tests for required headers.

**Non-Goals:**
- No changes to retry/backoff or timeout behavior.
- No changes to import progress event sequencing.
- No changes to non-import HTTP paths.

## Decisions

### Decision: Define one shared import header constant
Use a shared constant for import request headers and reuse it at both request sites.

Rationale: avoids duplicated literals and keeps both requests compliant if values change.

Alternatives considered:
- Duplicating inline headers at each fetch site: simple but drift-prone.
- Global fetch wrapper: broader refactor than needed for this scoped change.

### Decision: Use versioned User-Agent format
Set `User-Agent` to `scrycall/0.1.0` and `Accept` to `application/json`.

Rationale: versioned user agent improves diagnostics while honoring the required app-name identity.

Alternatives considered:
- `User-Agent: scrycall` without version: valid but less informative for support/debugging.
- `Accept: */*`: also valid, but `application/json` better reflects expected content.

### Decision: Validate headers via import test assertions
Extend existing import orchestration tests to assert fetch is called with required headers.

Rationale: protects against regressions and verifies both compliance requirements directly in CI.

Alternatives considered:
- No tests: lower effort but risks silent regressions.
- Separate new test file: unnecessary overhead for small scoped behavior.

## Risks / Trade-offs

- Hardcoded version in `User-Agent` can drift from `package.json`.
  Mitigation: keep this scoped fix simple now; future cleanup can centralize version metadata.

- Bulk `download_uri` may point outside `api.scryfall.com`.
  Mitigation: sending `User-Agent` and `Accept` remains safe and standards-compliant.

- Header object reuse between modules can introduce import coupling.
  Mitigation: keep exported constant in import-layer module only and avoid broader dependency spread.
