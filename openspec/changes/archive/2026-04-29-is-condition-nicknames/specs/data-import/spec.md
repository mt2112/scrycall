## CHANGED Requirements

### Requirement: Importer extracts layout field from Scryfall JSON
The importer SHALL extract the `layout` field from each Scryfall card object and store it in the `layout` column of the `cards` table. The `ScryfallCard` interface SHALL include an optional `layout` field.

#### Scenario: Card with layout field
- **WHEN** a card with `layout: "normal"` is imported
- **THEN** the `layout` column for that card contains "normal"

#### Scenario: Split card layout
- **WHEN** a card with `layout: "split"` is imported
- **THEN** the `layout` column for that card contains "split"

#### Scenario: Modal DFC layout
- **WHEN** a card with `layout: "modal_dfc"` is imported
- **THEN** the `layout` column for that card contains "modal_dfc"

### Requirement: Importer computes and inserts card tags
After inserting a card and its auxiliary data (colors, keywords, legalities), the importer SHALL call `tagCard(card)` from the tagger module and insert each returned tag into the `card_tags` table using a prepared statement.

#### Scenario: Card receives tags during import
- **WHEN** a card matching the fetchland criteria is imported
- **THEN** a row `(card_id, 'fetchland')` is inserted into `card_tags`

#### Scenario: Card receives multiple tags
- **WHEN** a legendary creature is imported
- **THEN** rows for both "commander" and "brawler" tags are inserted into `card_tags`

#### Scenario: Card receives no tags
- **WHEN** a vanilla common creature is imported
- **THEN** no rows are inserted into `card_tags` for that card

### Requirement: Importer clears card_tags on reimport
The importer SHALL delete all rows from `card_tags` at the start of the import transaction, alongside the existing DELETE statements for other auxiliary tables.

#### Scenario: Reimport replaces tags
- **WHEN** a reimport is performed
- **THEN** old `card_tags` rows are deleted and new tags are computed from the fresh data

### Requirement: INSERT card statement includes layout
The prepared INSERT statement for cards SHALL include the `layout` column.

#### Scenario: INSERT includes layout
- **WHEN** a card is inserted during import
- **THEN** the INSERT OR REPLACE statement includes the `layout` value
