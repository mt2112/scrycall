import type { Card } from '../models/card.js';
import { formatCardDetail, formatCardList } from './card-formatter.js';

export function printSearchResults(cards: readonly Card[]): void {
  console.log(formatCardList(cards));
}

export function printCardDetail(card: Card): void {
  console.log(formatCardDetail(card));
}
