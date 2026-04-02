## ADDED Requirements

### Requirement: ImportProgressEvent type definition
The system SHALL define an `ImportProgressEvent` discriminated union type with a `phase` field. The valid phases SHALL be `'manifest'`, `'download'`, `'parse'`, `'write'`, and `'index'`.

#### Scenario: All phases are representable
- **WHEN** a progress callback receives an event
- **THEN** the `phase` field is one of `'manifest'`, `'download'`, `'parse'`, `'write'`, or `'index'`

### Requirement: Progress callback type
The system SHALL define an `ImportProgressCallback` type as a function that accepts an `ImportProgressEvent` and returns `void`.

#### Scenario: Callback signature
- **WHEN** a callback is provided to the import pipeline
- **THEN** it receives `ImportProgressEvent` objects and returns nothing
