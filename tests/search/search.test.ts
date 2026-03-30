import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/db/migrations.js';
import { search } from '../../src/search/search.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function seedCards(db: Database.Database): void {
  const insertCard = db.prepare(
    `INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, power, toughness, set_code, set_name, rarity, loyalty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertColor = db.prepare('INSERT INTO card_colors (card_id, color) VALUES (?, ?)');
  const insertIdentity = db.prepare('INSERT INTO card_color_identity (card_id, color) VALUES (?, ?)');
  const insertKeyword = db.prepare('INSERT INTO card_keywords (card_id, keyword) VALUES (?, ?)');
  const insertLegality = db.prepare('INSERT INTO card_legalities (card_id, format, status) VALUES (?, ?, ?)');

  // Lightning Bolt - Red Instant
  insertCard.run('bolt-1', 'oracle-bolt', 'Lightning Bolt', '{R}', 1, 'Instant', 'Lightning Bolt deals 3 damage to any target.', null, null, 'lea', 'Alpha', 'common', null);
  insertColor.run('bolt-1', 'R');
  insertIdentity.run('bolt-1', 'R');
  insertLegality.run('bolt-1', 'modern', 'legal');
  insertLegality.run('bolt-1', 'legacy', 'legal');

  // Serra Angel - White Creature with Flying
  insertCard.run('serra-1', 'oracle-serra', 'Serra Angel', '{3}{W}{W}', 5, 'Creature — Angel', 'Flying, vigilance', '4', '4', 'lea', 'Alpha', 'uncommon', null);
  insertColor.run('serra-1', 'W');
  insertIdentity.run('serra-1', 'W');
  insertKeyword.run('serra-1', 'Flying');
  insertKeyword.run('serra-1', 'Vigilance');
  insertLegality.run('serra-1', 'modern', 'legal');
  insertLegality.run('serra-1', 'legacy', 'legal');

  // Nicol Bolas - Multicolor Creature
  insertCard.run('bolas-1', 'oracle-bolas', 'Nicol Bolas', '{2}{U}{B}{R}', 5, 'Legendary Creature — Elder Dragon', 'Flying', '7', '7', 'leg', 'Legends', 'rare', null);
  insertColor.run('bolas-1', 'U');
  insertColor.run('bolas-1', 'B');
  insertColor.run('bolas-1', 'R');
  insertIdentity.run('bolas-1', 'U');
  insertIdentity.run('bolas-1', 'B');
  insertIdentity.run('bolas-1', 'R');
  insertKeyword.run('bolas-1', 'Flying');
  insertLegality.run('bolas-1', 'modern', 'not_legal');
  insertLegality.run('bolas-1', 'legacy', 'legal');

  // Tarmogoyf - Green Creature
  insertCard.run('goyf-1', 'oracle-goyf', 'Tarmogoyf', '{1}{G}', 2, 'Creature — Lhurgoyf', "Tarmogoyf's power is equal to the number of card types among cards in all graveyards and its toughness is that number plus 1.", '*', '*+1', 'fut', 'Future Sight', 'mythic', null);
  insertColor.run('goyf-1', 'G');
  insertIdentity.run('goyf-1', 'G');
  insertLegality.run('goyf-1', 'modern', 'legal');
  insertLegality.run('goyf-1', 'legacy', 'legal');
}

describe('search integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedCards(db);
  });

  it('should search by type', () => {
    const result = search(db, 't:creature');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(3); // Serra Angel, Nicol Bolas, Tarmogoyf
    expect(result.data.map((c) => c.name).sort()).toEqual(['Nicol Bolas', 'Serra Angel', 'Tarmogoyf']);
  });

  it('should search by rarity', () => {
    const result = search(db, 'r:common');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Lightning Bolt');
  });

  it('should search by rarity ordinal', () => {
    const result = search(db, 'r>=rare');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(2); // Nicol Bolas (rare), Tarmogoyf (mythic)
  });

  it('should search by format legality', () => {
    const result = search(db, 'f:modern');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Bolt, Serra Angel, Tarmogoyf are legal in modern; Bolas is not_legal
    expect(result.data.length).toBe(3);
    expect(result.data.map((c) => c.name)).not.toContain('Nicol Bolas');
  });

  it('should search by keyword', () => {
    const result = search(db, 'kw:flying');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(2); // Serra Angel, Nicol Bolas
  });

  it('should search by mana value', () => {
    const result = search(db, 'mv>=5');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(2); // Serra Angel (5), Nicol Bolas (5)
  });

  it('should search by set', () => {
    const result = search(db, 's:lea');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(2); // Bolt and Serra Angel
  });

  it('should handle AND queries', () => {
    const result = search(db, 't:creature kw:flying');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(2); // Serra Angel, Nicol Bolas
  });

  it('should handle OR queries', () => {
    const result = search(db, 'r:common or r:mythic');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(2); // Bolt (common), Tarmogoyf (mythic)
  });

  it('should handle NOT queries', () => {
    const result = search(db, 't:creature -kw:flying');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(1); // Tarmogoyf
    expect(result.data[0].name).toBe('Tarmogoyf');
  });

  it('should return parse error for invalid query', () => {
    const result = search(db, '(unclosed');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('parse');
  });

  it('should search by name via FTS', () => {
    const result = search(db, 'lightning bolt');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].name).toBe('Lightning Bolt');
  });

  it('should search by type:legendary', () => {
    const result = search(db, 't:legendary');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe('Nicol Bolas');
  });
});

describe('search integration: is/not/has conditions', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedExtendedCards(db);
  });

  it('should search by is:spell (excludes lands)', () => {
    const result = search(db, 'is:spell');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.data.map(c => c.name);
    expect(names).toContain('Lightning Bolt');
    expect(names).toContain('Grizzly Bears');
    expect(names).not.toContain('Forest');
  });

  it('should search by not:spell (includes lands)', () => {
    const result = search(db, 'not:spell');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.data.map(c => c.name);
    expect(names).toContain('Forest');
  });

  it('should search by is:permanent', () => {
    const result = search(db, 'is:permanent');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.data.map(c => c.name);
    expect(names).toContain('Grizzly Bears');
    expect(names).toContain('Forest');
    expect(names).not.toContain('Lightning Bolt'); // Instants not permanent
  });

  it('should search by is:vanilla', () => {
    const result = search(db, 'is:vanilla');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe('Grizzly Bears');
  });

  it('should search by is:bear', () => {
    const result = search(db, 'is:bear');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe('Grizzly Bears');
  });

  it('should search by is:hybrid', () => {
    const result = search(db, 'is:hybrid');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe('Kitchen Finks');
  });

  it('should search by has:loyalty', () => {
    const result = search(db, 'has:loyalty');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe('Jace Beleren');
  });

  it('should search by has:pt', () => {
    const result = search(db, 'has:pt');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.data.map(c => c.name);
    expect(names).toContain('Grizzly Bears');
    expect(names).toContain('Kitchen Finks');
    expect(names).not.toContain('Lightning Bolt');
    expect(names).not.toContain('Forest');
  });

  it('should combine is: with other conditions', () => {
    const result = search(db, 'is:spell c:green');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Green spells: Grizzly Bears and Kitchen Finks (green+white, is a spell)
    const names = result.data.map(c => c.name);
    expect(names).toContain('Grizzly Bears');
    expect(names).not.toContain('Forest');
  });

  it('should combine is: with OR', () => {
    const result = search(db, 'is:vanilla or has:loyalty');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.data.map(c => c.name);
    expect(names).toContain('Grizzly Bears');
    expect(names).toContain('Jace Beleren');
  });
});

describe('search integration: numeric color count', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedExtendedCards(db);
  });

  it('should search by c=2 (exactly 2 colors)', () => {
    const result = search(db, 'c=2');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe('Kitchen Finks');
  });

  it('should search by c=0 (colorless)', () => {
    const result = search(db, 'c=0');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.data.map(c => c.name);
    expect(names).toContain('Forest');
  });

  it('should combine numeric color count with type', () => {
    const result = search(db, 'c>=1 t:creature');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.data.map(c => c.name);
    expect(names).toContain('Grizzly Bears');
    expect(names).toContain('Kitchen Finks');
    expect(names).not.toContain('Forest');
  });
});

function seedExtendedCards(db: Database.Database): void {
  const insertCard = db.prepare(
    `INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, power, toughness, set_code, set_name, rarity, loyalty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertColor = db.prepare('INSERT INTO card_colors (card_id, color) VALUES (?, ?)');
  const insertIdentity = db.prepare('INSERT INTO card_color_identity (card_id, color) VALUES (?, ?)');
  const insertKeyword = db.prepare('INSERT INTO card_keywords (card_id, keyword) VALUES (?, ?)');

  // Lightning Bolt - Red Instant (spell, not permanent)
  insertCard.run('bolt-1', 'oracle-bolt', 'Lightning Bolt', '{R}', 1, 'Instant', 'Lightning Bolt deals 3 damage to any target.', null, null, 'lea', 'Alpha', 'common', null);
  insertColor.run('bolt-1', 'R');
  insertIdentity.run('bolt-1', 'R');

  // Grizzly Bears - Green 2/2 Creature (vanilla, bear)
  insertCard.run('bears-1', 'oracle-bears', 'Grizzly Bears', '{1}{G}', 2, 'Creature — Bear', null, '2', '2', 'lea', 'Alpha', 'common', null);
  insertColor.run('bears-1', 'G');
  insertIdentity.run('bears-1', 'G');

  // Forest - Basic Land (not a spell, is permanent)
  insertCard.run('forest-1', 'oracle-forest', 'Forest', null, 0, 'Basic Land — Forest', null, null, null, 'lea', 'Alpha', 'common', null);

  // Kitchen Finks - G/W Hybrid creature
  insertCard.run('finks-1', 'oracle-finks', 'Kitchen Finks', '{1}{G/W}{G/W}', 3, 'Creature — Ouphe', 'When Kitchen Finks enters the battlefield, you gain 2 life.\nPersist', '3', '2', 'shm', 'Shadowmoor', 'uncommon', null);
  insertColor.run('finks-1', 'G');
  insertColor.run('finks-1', 'W');
  insertIdentity.run('finks-1', 'G');
  insertIdentity.run('finks-1', 'W');
  insertKeyword.run('finks-1', 'Persist');

  // Jace Beleren - Blue Planeswalker
  insertCard.run('jace-1', 'oracle-jace', 'Jace Beleren', '{1}{U}{U}', 3, 'Legendary Planeswalker — Jace', '+2: Each player draws a card.\n-1: Target player draws a card.\n-10: Target player mills twenty cards.', null, null, 'm11', 'Magic 2011', 'mythic', '3');
  insertColor.run('jace-1', 'U');
  insertIdentity.run('jace-1', 'U');
}
