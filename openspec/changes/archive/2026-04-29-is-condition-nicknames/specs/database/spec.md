## CHANGED Requirements

### Requirement: Migration 003 adds layout column and card_tags table
The system SHALL provide a migration (003) that:
1. Adds a `layout TEXT` column to the `cards` table
2. Creates a `card_tags` table with columns `card_id TEXT NOT NULL` (foreign key to cards.id with CASCADE delete) and `tag TEXT NOT NULL`, with composite primary key `(card_id, tag)`
3. Creates an index `idx_card_tags_tag` on `card_tags(tag)`

#### Scenario: Migration adds layout column
- **WHEN** migration 003 is applied to a database with migrations 001 and 002
- **THEN** the `cards` table gains a `layout` column with NULL default

#### Scenario: Migration creates card_tags table
- **WHEN** migration 003 is applied
- **THEN** the `card_tags` table exists with columns `card_id` and `tag`

#### Scenario: card_tags has index on tag
- **WHEN** migration 003 is applied
- **THEN** an index `idx_card_tags_tag` exists on the `tag` column

#### Scenario: card_tags foreign key cascades on delete
- **WHEN** a card is deleted from the `cards` table
- **THEN** all corresponding rows in `card_tags` are also deleted
