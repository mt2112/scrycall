## MODIFIED Requirements

### Requirement: Fetch bulk data manifest from Scryfall API
The system SHALL fetch the bulk data manifest from `https://api.scryfall.com/bulk-data` and extract the `download_uri` for the `oracle_cards` type. The request SHALL include an explicit `User-Agent` header identifying the application as `scrycall` and an explicit `Accept` header.

#### Scenario: Successful manifest fetch
- **WHEN** the bulk data endpoint is reachable
- **THEN** the system returns the download URI for oracle_cards

#### Scenario: API unreachable
- **WHEN** the bulk data endpoint returns an error or is unreachable
- **THEN** the system returns `err` with an ImportError describing the failure

### Requirement: Download oracle cards with streaming
The system SHALL download the oracle_cards JSON file from the obtained URI. The download SHALL stream data rather than buffering the entire file in memory. The request SHALL include an explicit `User-Agent` header identifying the application as `scrycall` and an explicit `Accept` header.

#### Scenario: Successful download
- **WHEN** the download URI is valid
- **THEN** the JSON data is streamed for processing without loading the full ~162 MB into memory
