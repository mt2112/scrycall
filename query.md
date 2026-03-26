# Scrycall Query Syntax

Scrycall uses a Scryfall-inspired query language for searching Magic: The Gathering cards.

## Basic Usage

```
scrycall search "<query>"
```

Text without a field prefix searches by card name:

```
scrycall search "lightning bolt"
```

## Fields

Each field has a short and long form. Fields use an operator (`:`, `=`, `>=`, etc.) followed by a value.

| Short | Long        | Description                          | Example              |
|-------|-------------|--------------------------------------|----------------------|
| `c`   | `color`     | Card colors (W/U/B/R/G)             | `c:red`              |
| `id`  | `identity`  | Color identity                       | `id:ub`              |
| `t`   | `type`      | Type line (substring match)          | `t:creature`         |
| `o`   | `oracle`    | Oracle/rules text (full-text search) | `o:destroy`          |
| `m`   | `mana`      | Mana cost (substring match)          | `m:{B}{B}{B}`        |
| `mv`  | `manavalue` | Mana value / CMC (numeric)           | `mv>=3`              |
| `pow` | `power`     | Power (numeric)                      | `pow>=4`             |
| `tou` | `toughness` | Toughness (numeric)                  | `tou<=2`             |
| `pt`  | `powtou`    | Combined power + toughness (numeric) | `pt>=8`              |
| `loy` | `loyalty`   | Planeswalker loyalty (numeric)       | `loy>=3`             |
| `r`   | `rarity`    | Rarity                               | `r:mythic`           |
| `s`   | `set`       | Set code                             | `s:dmu`              |
| `e`   | `edition`   | Set code (alias for `s:`)            | `e:lea`              |
| `f`   | `format`    | Format legality                      | `f:modern`           |
| `kw`  | `keyword`   | Keyword ability                      | `kw:flying`          |
|       | `name`      | Card name (substring match)          | `name:bolt`          |
|       | `banned`    | Banned in format                     | `banned:modern`      |
|       | `restricted`| Restricted in format                 | `restricted:vintage` |

`cmc` is also accepted as an alias for `mv`.

## Operators

| Operator | Meaning                 | Example           |
|----------|-------------------------|--------------------|
| `:`      | Contains / includes     | `c:red`            |
| `=`      | Exactly equals          | `c=red`            |
| `!=`     | Not equal               | `r!=common`        |
| `>`      | Greater than            | `pow>4`            |
| `>=`     | Greater than or equal   | `mv>=3`            |
| `<`      | Less than               | `tou<3`            |
| `<=`     | Less than or equal      | `mv<=2`            |

The `:` operator is the default and its behavior depends on the field (see details below).

## Boolean Logic

### Implicit AND

Multiple terms are joined with AND by default. The `and` keyword is also accepted but optional:

```
c:red t:creature            # red AND creature
c:red and t:creature        # same — explicit AND
t:creature pow>=4 f:modern  # creature AND power>=4 AND modern-legal
```

### OR

Use `or` (case-insensitive) between terms:

```
t:instant or t:sorcery    # instants OR sorceries
c:red or c:green          # red OR green cards
```

### Negation

Prefix a term with `-` to negate:

```
t:creature -c:red         # creatures that are NOT red
-kw:flying t:creature     # creatures without flying
```

### Parentheses

Group expressions to control precedence. AND binds tighter than OR:

```
# Without parens: OR(AND(c:red, t:creature), t:instant)
c:red t:creature or t:instant

# With parens: AND(c:red, OR(t:creature, t:instant))
c:red (t:creature or t:instant)
```

## Field Details

### Color (`c:` / `color:`)

Colors can be specified as:

- **Names**: `white`, `blue`, `black`, `red`, `green`, `colorless`
- **Letters**: `W`, `U`, `B`, `R`, `G` (case-insensitive)
- **Combined letters**: `rg` for red and green, `wub` for white/blue/black
- **Guild/shard/clan names**: `azorius`, `dimir`, `grixis`, `jund`, `bant`, `temur`, etc.
- **Mana symbols**: `{W}{G}` (braces are stripped, color letters extracted)

Operator behavior for colors:

| Query           | Meaning                                             |
|-----------------|-----------------------------------------------------|
| `c:red`         | Card has red among its colors (at least red)        |
| `c:rg`          | Card has at least red AND green                     |
| `c=red`         | Card is exactly mono-red                            |
| `c>red`         | Card has red plus at least one other color           |
| `c>=red`        | Card has at least red (same as `c:red`)              |
| `c<rg`          | Card's colors are a strict subset of red/green       |
| `c<=rg`         | Card's colors are a subset of red/green              |
| `c!=red`        | Card is not exactly mono-red                         |
| `c:colorless`   | Card has no colors                                   |
| `c=colorless`   | Card has no colors (same as `c:colorless`)           |

**Supported color aliases:**

Guilds: `azorius` (WU), `dimir` (UB), `rakdos` (BR), `gruul` (RG), `selesnya` (GW), `orzhov` (WB), `izzet` (UR), `golgari` (BG), `boros` (RW), `simic` (GU)

Shards: `esper` (WUB), `grixis` (UBR), `jund` (BRG), `naya` (RGW), `bant` (GWU)

Clans: `abzan` (WBG), `jeskai` (URW), `sultai` (BGU), `mardu` (RWB), `temur` (URG)

Four-color: `chaos` (UBRG), `aggression` (WBRG), `altruism` (WURG), `growth` (WUBG), `artifice` (WUBR)

**Special values:**

| Query            | Meaning                                |
|------------------|----------------------------------------|
| `c:multicolor`   | Cards with 2 or more colors            |
| `c:m`            | Same as `c:multicolor`                 |

### Color Identity (`id:` / `identity:`)

Same syntax and operators as color, but searches color identity instead of card colors. Color identity includes colors in mana costs and rules text.

```
id:ub             # identity includes blue and black
id:temur          # identity includes blue, red, and green
```

### Type (`t:` / `type:`)

Substring match against the full type line (case-insensitive):

```
t:creature        # any creature
t:legendary       # legendary permanents
t:elf             # cards with "elf" in type line
t:planeswalker    # planeswalkers
t:artifact        # artifacts
```

### Oracle Text (`o:` / `oracle:`)

Full-text search on oracle/rules text using FTS5:

```
o:destroy         # cards mentioning "destroy"
o:draw            # cards mentioning "draw"
o:"draw a card"   # quoted phrase search
```

### Mana Cost (`m:` / `mana:`)

Substring match against the mana cost string:

```
m:{R}{R}          # cards with at least {R}{R} in mana cost
m:{B}{B}{B}       # cards with at least {B}{B}{B}
m:{W}{U}          # cards with {W}{U} in mana cost
```

Note: This is substring matching, so `m:{R}{R}` will also match cards with `{R}{R}{R}` in their cost.

### Mana Value (`mv` / `manavalue` / `cmc`)

Numeric comparison against converted mana cost:

```
mv=3              # exactly 3 mana value
mv>=5             # 5 or more
mv<=2             # 2 or less
mv:3              # exactly 3 (: treated as =)
mv:even           # cards with even mana value (0, 2, 4, ...)
mv:odd            # cards with odd mana value (1, 3, 5, ...)
```

### Power (`pow` / `power`) and Toughness (`tou` / `toughness`)

Numeric comparison. Cards with variable power/toughness (e.g., `*`) are excluded from numeric comparisons.

```
pow>=4            # power 4 or greater
pow=7             # exactly 7 power
tou<=2            # toughness 2 or less
```

**Cross-field comparison:** You can compare one numeric field against another:

```
pow>tou           # power greater than toughness
tou>=pow          # toughness >= power
pow>cmc           # power exceeds mana value
mv>=loyalty       # mana value >= loyalty
```

Valid field references: `pow`, `power`, `tou`, `toughness`, `loy`, `loyalty`, `cmc`, `mv`.

### Combined Power+Toughness (`pt` / `powtou`)

Numeric comparison against the sum of power and toughness. Excludes cards with variable (`*`) power or toughness.

```
pt>=8             # power + toughness >= 8
pt=14             # power + toughness exactly 14
```

### Loyalty (`loy` / `loyalty`)

Numeric comparison for planeswalker loyalty:

```
loy>=3            # loyalty 3 or more
loy=6             # exactly 6 loyalty
```

### Rarity (`r:` / `rarity:`)

Values: `common`, `uncommon`, `rare`, `mythic`.

Supports ordinal comparison (common < uncommon < rare < mythic):

```
r:rare            # exactly rare
r>=rare           # rare or mythic
r>uncommon        # rare or mythic
r<=uncommon       # common or uncommon
```

### Set (`s:` / `set:` / `e:` / `edition:`)

Match by set code (case-insensitive). `e:` and `edition:` are aliases for `s:`.

```
s:dmu             # Dominaria United
e:lea             # Alpha (same as s:lea)
edition:neo       # Kamigawa: Neon Dynasty
```

See [sets.md](sets.md) for the complete list of 551 set codes.

### Format Legality (`f:` / `format:`)

Cards that are legal or restricted in a format:

```
f:modern          # modern-legal cards
f:standard        # standard-legal cards
f:legacy          # legacy-legal cards
```

Use `!=` to exclude a format:

```
f!=standard       # cards not legal in standard
```

**Available formats:**

`alchemy`, `brawl`, `commander`, `duel`, `future`, `gladiator`, `historic`, `legacy`, `modern`, `oathbreaker`, `oldschool`, `pauper`, `paupercommander`, `penny`, `pioneer`, `predh`, `premodern`, `standard`, `standardbrawl`, `timeless`, `vintage`

### Banned / Restricted

Find cards banned or restricted in a specific format:

```
banned:modern         # cards banned in modern
restricted:vintage    # cards restricted in vintage
-banned:modern        # cards NOT banned in modern
```

### Keyword Abilities (`kw:` / `keyword:`)

Match keyword abilities (case-insensitive):

```
kw:flying         # cards with flying
kw:deathtouch     # cards with deathtouch
kw:trample        # cards with trample
```

See [keywords.md](keywords.md) for the complete list of 732 keyword abilities.

### Name (`name:`)

Explicit substring search on card name (case-insensitive). Equivalent to bare text search:

```
name:bolt         # cards with "bolt" in the name
name:"serra angel" # cards with "serra angel" in the name
```

### Exact Name (`!`)

Prefix a name with `!` for an exact case-insensitive match:

```
!"Lightning Bolt"  # exactly "Lightning Bolt"
!Shock             # exactly "Shock"
!"serra angel"     # case-insensitive exact match
```

## Example Queries

```bash
# Red creatures with power >= 4
scrycall search "c:red t:creature pow>=4"

# Blue instants or sorceries
scrycall search "c:blue (t:instant or t:sorcery)"

# Modern-legal flying creatures that aren't red
scrycall search "f:modern t:creature kw:flying -c:red"

# Multicolor legendary creatures
scrycall search "c>colorless t:legendary t:creature"

# Cheap green creatures (CMC 2 or less)
scrycall search "c:green t:creature mv<=2"

# Cards with triple black in mana cost
scrycall search "m:{B}{B}{B}"

# Mythic rare planeswalkers
scrycall search "r:mythic t:planeswalker"

# Cards with both deathtouch and lifelink
scrycall search "kw:deathtouch kw:lifelink"

# Grixis-colored (UBR) creatures legal in legacy
scrycall search "c:grixis t:creature f:legacy"

# Elf or goblin tribal
scrycall search "t:elf or t:goblin"

# Find a card by name
scrycall search "lightning bolt"

# Explicit name field search
scrycall search "name:bolt"

# Exact name match (case-insensitive)
scrycall search '!"Lightning Bolt"'
scrycall search "!Shock"

# Multicolor creatures
scrycall search "c:multicolor t:creature"

# Cards with even mana value
scrycall search "mv:even t:creature"

# Planeswalkers with high loyalty
scrycall search "t:planeswalker loy>=5"

# Cards banned in modern
scrycall search "banned:modern"

# Creatures where power exceeds toughness
scrycall search "t:creature pow>tou"

# View detailed card info
scrycall card "Lightning Bolt"
```
