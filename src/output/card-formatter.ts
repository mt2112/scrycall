import type { Card } from '../models/card.js';

export function formatCardDetail(card: Card): string {
  const lines: string[] = [];

  // Name and mana cost
  const nameLine = card.manaCost ? `${card.name} ${card.manaCost}` : card.name;
  lines.push(nameLine);

  // Type line
  lines.push(card.typeLine);

  // Separator
  lines.push('');

  // Oracle text
  if (card.oracleText) {
    lines.push(card.oracleText);
    lines.push('');
  }

  // Power/toughness or loyalty
  if (card.power !== null && card.toughness !== null) {
    lines.push(`${card.power}/${card.toughness}`);
  } else if (card.loyalty !== null) {
    lines.push(`Loyalty: ${card.loyalty}`);
  }

  // Set and rarity
  lines.push(`${card.setName} (${card.set.toUpperCase()}) — ${capitalize(card.rarity)}`);

  return lines.join('\n');
}

export function formatCardList(cards: readonly Card[]): string {
  if (cards.length === 0) {
    return 'No cards found.';
  }

  const lines = cards.map((card) => {
    const mana = card.manaCost ? ` ${card.manaCost}` : '';
    return `${card.name}${mana} — ${card.typeLine}`;
  });

  lines.push('');
  lines.push(`${cards.length} card${cards.length === 1 ? '' : 's'} found.`);

  return lines.join('\n');
}

export function formatNumberedCardList(
  cards: readonly Card[],
  totalCount: number,
): string {
  const lines = cards.map((card, i) => {
    const mana = card.manaCost ? ` ${card.manaCost}` : '';
    return `  ${i + 1}. ${card.name}${mana} — ${card.typeLine}`;
  });

  if (totalCount > cards.length) {
    lines.push('');
    lines.push(`  ...and ${totalCount - cards.length} more.`);
  }

  return lines.join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
