## ADDED Requirements

### Requirement: Query syntax supports `and` keyword
The query system SHALL accept `and` (case-insensitive) between terms as an explicit AND conjunction. Since AND is implicit, `and` SHALL be treated as a no-op and skipped during tokenization. Queries using `and` SHALL produce identical results to queries without it.

#### Scenario: Explicit `and` between field queries
- **WHEN** the user searches `t:elf and t:cleric`
- **THEN** cards matching both type `elf` AND type `cleric` are returned

#### Scenario: `and` in complex query
- **WHEN** the user searches `c:{W}{G} (t:elf and t:cleric) pow=2`
- **THEN** cards matching all conditions are returned

### Requirement: Query syntax supports `e:` and `edition:` set aliases
The query system SHALL accept `e:` and `edition:` as aliases for `s:`/`set:`, matching Scryfall's convention.

#### Scenario: Search by edition alias
- **WHEN** the user searches `e:m21`
- **THEN** cards from set `m21` are returned, identical to `s:m21`

### Requirement: Query syntax supports four-color aliases
The query system SHALL accept four-color alias names in color and color identity queries: `chaos` (UBRG), `aggression` (WBRG), `altruism` (WURG), `growth` (WUBG), and `artifice` (WUBR).

#### Scenario: Four-color alias in color query
- **WHEN** the user searches `c:chaos`
- **THEN** cards with at least colors U, B, R, and G are returned

### Requirement: Query syntax supports `c:multicolor`
The query system SHALL accept `multicolor` and `m` as special values in color and color identity queries, matching cards with 2 or more colors.

#### Scenario: Multicolor search
- **WHEN** the user searches `c:multicolor t:creature`
- **THEN** multicolored creatures (2+ colors) are returned

#### Scenario: Short multicolor alias
- **WHEN** the user searches `c:m t:instant`
- **THEN** multicolored instants are returned

### Requirement: Query syntax supports loyalty field
The query system SHALL accept `loyalty`/`loy` as numeric query fields for planeswalker starting loyalty, supporting all comparison operators.

#### Scenario: Loyalty search
- **WHEN** the user searches `loy=3 t:planeswalker`
- **THEN** planeswalkers with starting loyalty 3 are returned

### Requirement: Query syntax supports explicit `name:` field
The query system SHALL accept `name:` as an explicit keyword prefix for name searches, using FTS5 full-text search identical to bare word queries.

#### Scenario: Explicit name search
- **WHEN** the user searches `name:bolt`
- **THEN** cards with "bolt" in their name are returned

### Requirement: Query syntax supports `!` exact name prefix
The query system SHALL accept `!` at the start of a term (bare word or quoted string) to perform exact case-insensitive name matching.

#### Scenario: Exact name search
- **WHEN** the user searches `!"Lightning Bolt"`
- **THEN** only the card named exactly "Lightning Bolt" is returned

#### Scenario: Exact name avoids partial matches
- **WHEN** the user searches `!fire`
- **THEN** only the card named exactly "Fire" is returned (not "Fireblast", "Fire // Ice", etc.)

### Requirement: Query syntax supports `banned:` and `restricted:` keywords
The query system SHALL accept `banned:` and `restricted:` keywords to find cards with a specific legality status in a given format.

#### Scenario: Banned card search
- **WHEN** the user searches `banned:legacy`
- **THEN** cards banned in the Legacy format are returned

#### Scenario: Restricted card search
- **WHEN** the user searches `restricted:vintage`
- **THEN** cards restricted in the Vintage format are returned

### Requirement: Query syntax supports `pt:`/`powtou:` combined stat
The query system SHALL accept `pt`/`powtou` as numeric query fields that compare the sum of a card's power and toughness.

#### Scenario: Combined stat search
- **WHEN** the user searches `pt>=10 t:creature`
- **THEN** creatures whose power + toughness totals 10 or more are returned

### Requirement: Query syntax supports `mv:even` and `mv:odd`
The query system SHALL accept `even` and `odd` as special string values for the `mv`/`manavalue`/`cmc` field, matching cards with even or odd mana values respectively.

#### Scenario: Even mana value search
- **WHEN** the user searches `mv:even c:red`
- **THEN** red cards with even mana values (0, 2, 4, 6, ...) are returned

#### Scenario: Odd mana value search
- **WHEN** the user searches `mv:odd t:instant`
- **THEN** instants with odd mana values (1, 3, 5, 7, ...) are returned

### Requirement: Query syntax supports cross-field numeric comparisons
The query system SHALL accept field reference names as values in numeric comparison queries. When a numeric field's value matches a known field name (`pow`, `power`, `tou`, `toughness`, `loy`, `loyalty`, `cmc`, `mv`), the system SHALL compare the two fields against each other.

#### Scenario: Power greater than toughness
- **WHEN** the user searches `pow>tou`
- **THEN** creatures whose power exceeds their toughness are returned

#### Scenario: Toughness equals power
- **WHEN** the user searches `tou=pow c:green`
- **THEN** green cards with equal power and toughness are returned
