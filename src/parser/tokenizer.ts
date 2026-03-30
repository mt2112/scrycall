import type { Token, SearchField, Operator } from '../models/query.js';

const KEYWORD_MAP: Record<string, SearchField> = {
  'c': 'color',
  'color': 'color',
  'id': 'colorIdentity',
  'identity': 'colorIdentity',
  't': 'type',
  'type': 'type',
  'o': 'oracle',
  'oracle': 'oracle',
  'm': 'mana',
  'mana': 'mana',
  'r': 'rarity',
  'rarity': 'rarity',
  's': 'set',
  'set': 'set',
  'e': 'set',
  'edition': 'set',
  'f': 'format',
  'format': 'format',
  'kw': 'keyword',
  'keyword': 'keyword',
  'name': 'name',
  'banned': 'banned',
  'restricted': 'restricted',
  'is': 'is',
  'not': 'not',
  'has': 'has',
};

const BARE_KEYWORD_MAP: Record<string, SearchField> = {
  'mv': 'manaValue',
  'manavalue': 'manaValue',
  'pow': 'power',
  'power': 'power',
  'tou': 'toughness',
  'toughness': 'toughness',
  'cmc': 'manaValue',
  'loyalty': 'loyalty',
  'loy': 'loyalty',
  'pt': 'powtou',
  'powtou': 'powtou',
};

function isOperatorChar(ch: string): boolean {
  return ch === ':' || ch === '=' || ch === '!' || ch === '>' || ch === '<';
}

function readOperator(input: string, pos: number): { op: Operator; end: number } | null {
  const ch = input[pos];
  if (ch === ':') return { op: ':', end: pos + 1 };
  if (ch === '=') return { op: '=', end: pos + 1 };
  if (ch === '!' && input[pos + 1] === '=') return { op: '!=', end: pos + 2 };
  if (ch === '>' && input[pos + 1] === '=') return { op: '>=', end: pos + 2 };
  if (ch === '>') return { op: '>', end: pos + 1 };
  if (ch === '<' && input[pos + 1] === '=') return { op: '<=', end: pos + 2 };
  if (ch === '<') return { op: '<', end: pos + 1 };
  return null;
}

function readQuotedString(input: string, pos: number): { value: string; end: number } {
  let end = pos + 1;
  while (end < input.length && input[end] !== '"') {
    end++;
  }
  const value = input.slice(pos + 1, end);
  if (end < input.length) end++; // skip closing quote
  return { value, end };
}

function readWord(input: string, pos: number): { value: string; end: number } {
  let end = pos;
  while (end < input.length && !isWhitespace(input[end]) && input[end] !== '(' && input[end] !== ')') {
    if (isOperatorChar(input[end]) && end > pos) break;
    end++;
  }
  return { value: input.slice(pos, end), end };
}

function readValue(input: string, pos: number): { value: string; end: number } {
  if (pos < input.length && input[pos] === '"') {
    return readQuotedString(input, pos);
  }
  let end = pos;
  while (end < input.length && !isWhitespace(input[end]) && input[end] !== '(' && input[end] !== ')') {
    end++;
  }
  return { value: input.slice(pos, end), end };
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Skip whitespace
    if (isWhitespace(input[pos])) {
      pos++;
      continue;
    }

    // Parentheses
    if (input[pos] === '(') {
      tokens.push({ kind: 'openParen' });
      pos++;
      continue;
    }
    if (input[pos] === ')') {
      tokens.push({ kind: 'closeParen' });
      pos++;
      continue;
    }

    // Negation prefix
    if (input[pos] === '-' && pos + 1 < input.length && !isWhitespace(input[pos + 1])) {
      tokens.push({ kind: 'negate' });
      pos++;
      continue;
    }

    // Exact name prefix (!word or !"quoted string")
    if (input[pos] === '!' && pos + 1 < input.length && input[pos + 1] !== '=') {
      pos++; // skip '!'
      if (pos < input.length && input[pos] === '"') {
        const { value, end } = readQuotedString(input, pos);
        tokens.push({ kind: 'exactName', value });
        pos = end;
      } else {
        const { value, end } = readWord(input, pos);
        if (value.length > 0) {
          tokens.push({ kind: 'exactName', value });
        }
        pos = end;
      }
      continue;
    }

    // Read a word and determine what it is
    const { value: word, end: wordEnd } = readWord(input, pos);
    const wordLower = word.toLowerCase();

    // Check for OR keyword
    if (wordLower === 'or') {
      tokens.push({ kind: 'or' });
      pos = wordEnd;
      continue;
    }

    // Skip AND keyword (AND is implicit)
    if (wordLower === 'and') {
      pos = wordEnd;
      continue;
    }

    // Check for bare keywords (mv, pow, tou, etc.) followed by operator
    if (wordLower in BARE_KEYWORD_MAP && wordEnd < input.length && isOperatorChar(input[wordEnd])) {
      const field = BARE_KEYWORD_MAP[wordLower];
      const opResult = readOperator(input, wordEnd);
      if (opResult) {
        const { value, end: valEnd } = readValue(input, opResult.end);
        tokens.push({ kind: 'keyword', field, operator: opResult.op, value });
        pos = valEnd;
        continue;
      }
    }

    // Check for colon-separated keywords (c:, t:, etc.)
    // The word might contain the colon, e.g. readWord stopped at ':'
    if (wordEnd < input.length && input[wordEnd] === ':' && wordLower in KEYWORD_MAP) {
      // It's like "c:" — keyword colon value
      const field = KEYWORD_MAP[wordLower];
      const opResult = readOperator(input, wordEnd);
      if (opResult) {
        const { value, end: valEnd } = readValue(input, opResult.end);
        tokens.push({ kind: 'keyword', field, operator: opResult.op, value });
        pos = valEnd;
        continue;
      }
    }

    // Check for keyword with operator (e.g. c>=red, c!=red)
    if (wordEnd < input.length && isOperatorChar(input[wordEnd]) && wordLower in KEYWORD_MAP) {
      const field = KEYWORD_MAP[wordLower];
      const opResult = readOperator(input, wordEnd);
      if (opResult) {
        const { value, end: valEnd } = readValue(input, opResult.end);
        tokens.push({ kind: 'keyword', field, operator: opResult.op, value });
        pos = valEnd;
        continue;
      }
    }

    // If the word contains a colon internally, split it
    const colonIdx = word.indexOf(':');
    if (colonIdx > 0) {
      const prefix = word.slice(0, colonIdx).toLowerCase();
      if (prefix in KEYWORD_MAP) {
        const field = KEYWORD_MAP[prefix];
        const valueAfterColon = word.slice(colonIdx + 1);
        if (valueAfterColon) {
          tokens.push({ kind: 'keyword', field, operator: ':', value: valueAfterColon });
          pos = wordEnd;
          continue;
        } else {
          // colon at end, read value after
          const { value, end: valEnd } = readValue(input, wordEnd);
          tokens.push({ kind: 'keyword', field, operator: ':', value });
          pos = valEnd;
          continue;
        }
      }
    }

    // Check for operator embedded in the word (like pow>=4 read as "pow>=4")
    // This handles the case where readWord reads past operator chars
    for (const [bareKey, field] of Object.entries(BARE_KEYWORD_MAP)) {
      if (wordLower.startsWith(bareKey)) {
        const rest = word.slice(bareKey.length);
        if (rest.length > 0) {
          const opResult = readOperator(rest, 0);
          if (opResult) {
            const value = rest.slice(opResult.end - 0);
            if (value.length > 0) {
              // Remap operator end to use the actual operator string
              tokens.push({ kind: 'keyword', field, operator: opResult.op, value });
              pos = wordEnd;
              break;
            }
          }
        }
      }
    }
    if (pos === wordEnd && tokens.length > 0 && tokens[tokens.length - 1].kind === 'keyword') {
      // Already handled by the loop above
      continue;
    }

    // Bare word (name search)
    if (word.length > 0) {
      tokens.push({ kind: 'bareWord', value: word });
    }
    pos = wordEnd;
  }

  return tokens;
}
