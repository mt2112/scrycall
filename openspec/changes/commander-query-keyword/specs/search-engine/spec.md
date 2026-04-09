## ADDED Requirements

### Requirement: Commander keyword queries use color identity subset logic
Commander queries (`commander:`) SHALL translate to a color identity subset check. The `commander:` field SHALL always use subset (`<=`) semantics regardless of the operator provided. `commander:RG` SHALL match cards whose color identity is a subset of {R, G}, which includes mono-red, mono-green, red-green, and colorless cards.

#### Scenario: Commander query with two colors
- **WHEN** the query is `commander:RG`
- **THEN** the SQL ensures the card's color identity is a subset of {R, G} (matches R, G, RG, and colorless cards)

#### Scenario: Commander query with color alias
- **WHEN** the query is `commander:gruul`
- **THEN** the SQL ensures the card's color identity is a subset of {R, G}

#### Scenario: Commander query combined with type filter
- **WHEN** the query is `t:vehicle commander:RG`
- **THEN** the SQL filters for Vehicle type AND color identity subset of {R, G}, returning colorless Vehicles and red/green Vehicles

#### Scenario: Commander query with single color
- **WHEN** the query is `commander:W`
- **THEN** the SQL ensures the card's color identity is a subset of {W} (matches mono-white and colorless cards)
