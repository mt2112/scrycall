export type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

export type Legality = 'legal' | 'not_legal' | 'banned' | 'restricted';

export type FormatLegality = Record<string, Legality>;

export interface Card {
  readonly id: string;
  readonly oracleId: string;
  readonly name: string;
  readonly manaCost: string | null;
  readonly cmc: number;
  readonly typeLine: string;
  readonly oracleText: string | null;
  readonly power: string | null;
  readonly toughness: string | null;
  readonly colors: readonly Color[];
  readonly colorIdentity: readonly Color[];
  readonly keywords: readonly string[];
  readonly set: string;
  readonly setName: string;
  readonly rarity: Rarity;
  readonly legalities: FormatLegality;
  readonly loyalty: string | null;
  readonly scryfallUri: string | null;
}
