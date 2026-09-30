/**
 * Using a trained vocabulary to split new text: greedy longest-match, per
 * word. At each position, try the longest remaining substring that's in the
 * vocabulary (continuation pieces looked up with their "##" prefix), emit
 * it, and continue from where it ended. If no substring at all matches —
 * even a single character — WordPiece doesn't fall back to partial pieces:
 * the *entire* word becomes [UNK]. That's a real, sometimes surprising
 * property of the real algorithm, not a simplification.
 */

export const UNK = '[UNK]';

export function tokenizeWord(word: string, vocab: ReadonlySet<string>): string[] | null {
  const chars = [...word];
  const tokens: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = chars.length;
    let match: string | null = null;
    while (end > start) {
      const raw = chars.slice(start, end).join('');
      const candidate = start === 0 ? raw : '##' + raw;
      if (vocab.has(candidate)) {
        match = candidate;
        break;
      }
      end -= 1;
    }
    if (match === null) return null; // the whole word falls back to [UNK]
    tokens.push(match);
    start = end;
  }
  return tokens;
}

export interface TokenizedWord {
  word: string;
  tokens: string[]; // [UNK] as a single-element array when the word can't be covered
  isUnk: boolean;
}

/** Splits on whitespace only — no punctuation handling, to keep the mechanism visible. */
export function tokenizeText(text: string, vocab: ReadonlySet<string>): TokenizedWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.map((word) => {
    const tokens = tokenizeWord(word, vocab);
    return tokens ? { word, tokens, isUnk: false } : { word, tokens: [UNK], isUnk: true };
  });
}
