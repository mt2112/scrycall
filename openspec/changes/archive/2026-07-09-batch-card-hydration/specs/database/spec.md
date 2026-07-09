## ADDED Requirements

### Requirement: Card result collections use set-based auxiliary hydration
Database query helpers that return multiple cards SHALL hydrate colors, color identity, keywords, and legalities through set-based auxiliary queries keyed by the returned card ids rather than issuing those auxiliary queries once per card.

#### Scenario: Search result hydration uses bounded auxiliary queries
- **WHEN** `searchCards` returns a result set containing multiple cards
- **THEN** the helper performs no more than one auxiliary lookup per normalized card table for that result set before constructing the returned `Card[]`

#### Scenario: Hydrated cards remain complete
- **WHEN** `searchCards` returns cards with colors, keywords, and legalities
- **THEN** each returned `Card` still contains the same populated array and legality fields as before the hydration refactor

### Requirement: Shared mapping preserves single-card completeness
Database query helpers that return one card SHALL use the same mapping rules as multi-card hydration so single-card detail lookups remain consistent with search results.

#### Scenario: Name lookup preserves array and legality fields
- **WHEN** `getCardByName` returns a matching card
- **THEN** the returned `Card` includes complete colors, color identity, keywords, and legalities using the same mapping rules as search results