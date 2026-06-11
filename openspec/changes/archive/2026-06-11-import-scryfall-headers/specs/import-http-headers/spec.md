## ADDED Requirements

### Requirement: Import requests include required Scryfall headers
The system SHALL include `User-Agent` and `Accept` headers on all HTTP requests made by the import pipeline to Scryfall data endpoints.

#### Scenario: Manifest request includes required headers
- **WHEN** `fetchBulkDataUri` requests `https://api.scryfall.com/bulk-data`
- **THEN** the request includes `User-Agent` identifying the app as `scrycall`
- **AND** the request includes an `Accept` header

#### Scenario: Bulk data download request includes required headers
- **WHEN** `runImport` requests the `download_uri` returned from the manifest
- **THEN** the request includes `User-Agent` identifying the app as `scrycall`
- **AND** the request includes an `Accept` header
