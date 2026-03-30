## MODIFIED Requirements

### Requirement: SearchField enum covers all keywords
The project SHALL define a `SearchField` type covering: `color`, `colorIdentity`, `type`, `oracle`, `mana`, `manaValue`, `power`, `toughness`, `rarity`, `set`, `format`, `keyword`, `name`, `loyalty`, `banned`, `restricted`, `powtou`, `is`, `not`, and `has`.

#### Scenario: All Scryfall keywords map to SearchField
- **WHEN** any supported keyword prefix (c:, t:, o:, m:, mv, pow, tou, r:, s:, e:, f:, kw:, id:, name:, banned:, restricted:, loy, pt, is:, not:, has:) is used
- **THEN** it maps to a specific SearchField value

#### Scenario: is keyword maps to SearchField
- **WHEN** the keyword prefix `is:` is used
- **THEN** it maps to SearchField value `is`

#### Scenario: not keyword maps to SearchField
- **WHEN** the keyword prefix `not:` is used
- **THEN** it maps to SearchField value `not`

#### Scenario: has keyword maps to SearchField
- **WHEN** the keyword prefix `has:` is used
- **THEN** it maps to SearchField value `has`
