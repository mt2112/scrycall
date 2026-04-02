import type { Card } from '../models/card.js';
import { formatCardDetail, formatCardList, formatNumberedCardList } from './card-formatter.js';

export function printSearchResults(cards: readonly Card[]): void {
  console.log(formatCardList(cards));
}

export function printCardDetail(card: Card): void {
  console.log(formatCardDetail(card));
}

export function printNumberedCardList(cards: readonly Card[], totalCount: number): void {
  console.log(formatNumberedCardList(cards, totalCount));
}
