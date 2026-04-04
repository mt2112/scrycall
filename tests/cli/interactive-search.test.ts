import { describe, it, expect, vi, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { promptForSelection } from '../../src/cli/commands/search.js';
import type { Card } from '../../src/models/card.js';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-id',
    oracleId: 'oracle-id',
    name: 'Lightning Bolt',
    manaCost: '{R}',
    cmc: 1,
    typeLine: 'Instant',
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    power: null,
    toughness: null,
    colors: ['R'],
    colorIdentity: ['R'],
    keywords: [],
    set: 'lea',
    setName: 'Limited Edition Alpha',
    rarity: 'common',
    legalities: {},
    loyalty: null,
    scryfallUri: null,
    ...overrides,
  };
}

function fakeStdin(lines: string[]): void {
  const input = lines.map((l) => l + '\n').join('');
  const readable = Readable.from(input);
  vi.spyOn(process, 'stdin', 'get').mockReturnValue(readable as unknown as typeof process.stdin);
}

const cards = [
  makeCard({ name: 'Lightning Bolt' }),
  makeCard({ name: 'Serra Angel', manaCost: '{3}{W}{W}', typeLine: 'Creature — Angel' }),
  makeCard({ name: 'Nicol Bolas', manaCost: '{2}{U}{B}{R}', typeLine: 'Legendary Creature — Elder Dragon' }),
];

describe('promptForSelection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onSelect with the correct card for a valid number', async () => {
    fakeStdin(['2', 'q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const onSelect = vi.fn();

    await promptForSelection(cards, onSelect);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(cards[1]);
  });

  it('exits on q input', async () => {
    fakeStdin(['q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const onSelect = vi.fn();

    await promptForSelection(cards, onSelect);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('exits on empty input', async () => {
    fakeStdin(['']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const onSelect = vi.fn();

    await promptForSelection(cards, onSelect);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows error for out-of-range number and continues', async () => {
    fakeStdin(['0', '5', '1', 'q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSelect = vi.fn();

    await promptForSelection(cards, onSelect);

    expect(errorSpy).toHaveBeenCalledWith('Invalid selection. Enter 1-3 or q to quit.');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(cards[0]);
  });

  it('shows error for non-numeric input and continues', async () => {
    fakeStdin(['abc', '2', 'q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSelect = vi.fn();

    await promptForSelection(cards, onSelect);

    expect(errorSpy).toHaveBeenCalledWith('Invalid selection. Enter 1-3 or q to quit.');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(cards[1]);
  });

  it('allows multiple selections before quitting', async () => {
    fakeStdin(['1', '3', 'q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const onSelect = vi.fn();

    await promptForSelection(cards, onSelect);

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(cards[0]);
    expect(onSelect).toHaveBeenCalledWith(cards[2]);
  });

  it('calls onOpen with the correct card for o{N} input', async () => {
    fakeStdin(['o2', 'q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const onSelect = vi.fn();
    const onOpen = vi.fn();

    await promptForSelection(cards, onSelect, onOpen);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(cards[1]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows error for out-of-range o{N} and continues', async () => {
    fakeStdin(['o0', 'o99', 'q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onOpen = vi.fn();

    await promptForSelection(cards, vi.fn(), onOpen);

    expect(errorSpy).toHaveBeenCalledWith('Invalid selection. Enter 1-3 or q to quit.');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not crash when onOpen is not provided', async () => {
    fakeStdin(['o1', 'q']);
    vi.spyOn(process, 'stderr', 'get').mockReturnValue({ write: vi.fn() } as unknown as typeof process.stderr);
    const onSelect = vi.fn();

    await promptForSelection(cards, onSelect);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
