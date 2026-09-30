import { describe, expect, it } from 'vitest';
import { tokenizeText, tokenizeWord, UNK } from './tokenize';

const VOCAB = new Set([
  'p',
  'l',
  'a',
  'y',
  'i',
  'n',
  'g',
  '##l',
  '##a',
  '##y',
  '##i',
  '##n',
  '##g',
  'play',
  '##ing',
]);

describe('tokenizeWord', () => {
  it('picks the longest matching prefix at each position (greedy)', () => {
    expect(tokenizeWord('playing', VOCAB)).toEqual(['play', '##ing']);
  });

  it('falls back to single characters when no larger piece matches', () => {
    expect(tokenizeWord('pi', VOCAB)).toEqual(['p', '##i']);
  });

  it('returns null for a word the vocab cannot fully cover', () => {
    // "z" never appears in this vocab, at any position
    expect(tokenizeWord('playz', VOCAB)).toBeNull();
  });

  it('never falls back to partial coverage — one bad character sinks the whole word', () => {
    // even though "play" itself is a known whole piece, the trailing "z" makes the
    // *entire* word unrecoverable, not just its last character
    const result = tokenizeWord('playz', VOCAB);
    expect(result).toBeNull();
  });
});

describe('tokenizeText', () => {
  it('tokenizes each whitespace-separated word independently', () => {
    const result = tokenizeText('play playing', VOCAB);
    expect(result).toEqual([
      { word: 'play', tokens: ['play'], isUnk: false },
      { word: 'playing', tokens: ['play', '##ing'], isUnk: false },
    ]);
  });

  it('marks an uncoverable word as [UNK] rather than partially tokenizing it', () => {
    const result = tokenizeText('play zzz', VOCAB);
    expect(result[1]).toEqual({ word: 'zzz', tokens: [UNK], isUnk: true });
  });

  it('ignores extra whitespace and empty input', () => {
    expect(tokenizeText('  play   playing  ', VOCAB)).toHaveLength(2);
    expect(tokenizeText('   ', VOCAB)).toHaveLength(0);
  });
});
