import { describe, expect, it } from 'vitest';
import { runSentence } from './inference';
import { INITIAL_WK, INITIAL_WQ, INITIAL_WV } from './setup';

describe('runSentence', () => {
  it('reproduces the exact training example when given "the cat sat"', () => {
    const result = runSentence('the cat sat', INITIAL_WQ, INITIAL_WK, INITIAL_WV);
    expect(result).not.toBeNull();
    expect(result!.queryIndex).toBe(2);
    expect(result!.fwd.weights[0]).toBeCloseTo(0.301517, 5);
    expect(result!.fwd.weights[2]).toBeCloseTo(0.374402, 5);
  });

  it('uses the last word as the query, whatever the sentence', () => {
    const result = runSentence('the dog ran', INITIAL_WQ, INITIAL_WK, INITIAL_WV);
    expect(result!.queryIndex).toBe(2);
    expect(result!.tokens.map((t) => t.word)).toEqual(['the', 'dog', 'ran']);
  });

  it('flags a word outside the vocabulary rather than guessing', () => {
    const result = runSentence('the xyzzy sat', INITIAL_WQ, INITIAL_WK, INITIAL_WV);
    expect(result!.tokens[1]).toMatchObject({ word: 'xyzzy', known: false });
    expect(result!.tokens[0]!.known).toBe(true);
  });

  it('returns null for empty input rather than crashing', () => {
    expect(runSentence('   ', INITIAL_WQ, INITIAL_WK, INITIAL_WV)).toBeNull();
  });

  it('attention weights always sum to 1, regardless of sentence length', () => {
    const result = runSentence('a bird flew quickly', INITIAL_WQ, INITIAL_WK, INITIAL_WV);
    const total = result!.fwd.weights.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});
