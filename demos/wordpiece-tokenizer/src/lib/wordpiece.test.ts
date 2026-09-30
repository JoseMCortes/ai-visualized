import { describe, expect, it } from 'vitest';
import { initTrainer, rankCandidates, splitWord, trainStep } from './wordpiece';

describe('splitWord', () => {
  it('marks every character after the first as a continuation piece', () => {
    expect(splitWord('play')).toEqual(['p', '##l', '##a', '##y']);
  });

  it('handles a single-character word', () => {
    expect(splitWord('a')).toEqual(['a']);
  });
});

describe('rankCandidates', () => {
  it('scores a single pair as freq(pair) / (freq(left) * freq(right))', () => {
    const state = initTrainer([{ word: 'ab', count: 1 }]);
    const [top] = rankCandidates(state);
    // "a" appears once, "##b" appears once, "a ##b" co-occurs once -> 1/(1*1)
    expect(top).toMatchObject({ left: 'a', right: '##b', pairFreq: 1, leftFreq: 1, rightFreq: 1 });
    expect(top!.score).toBeCloseTo(1);
  });

  it('breaks a genuine score tie by preferring the higher pair frequency', () => {
    // "a" appears 4x total (3x in "aa", 1x in "ab"); "##a" appears 3x; "##b" appears 1x.
    // score(a,##a) = 3/(4*3) = 0.25; score(a,##b) = 1/(4*1) = 0.25 -- a real tie.
    const state = initTrainer([
      { word: 'aa', count: 3 },
      { word: 'ab', count: 1 },
    ]);
    const ranked = rankCandidates(state);
    expect(ranked[0]!.score).toBeCloseTo(ranked[1]!.score);
    expect(ranked[0]).toMatchObject({ left: 'a', right: '##a', pairFreq: 3 });
    expect(ranked[1]).toMatchObject({ left: 'a', right: '##b', pairFreq: 1 });
  });

  it('returns no candidates once every word is a single symbol', () => {
    const state = initTrainer([{ word: 'a', count: 5 }]);
    expect(rankCandidates(state)).toHaveLength(0);
  });
});

describe('trainStep', () => {
  it('merges the winning pair everywhere it occurs and adds it to the vocabulary', () => {
    const state = initTrainer([
      { word: 'aa', count: 3 },
      { word: 'ab', count: 1 },
    ]);
    const step = trainStep(state);
    expect(step).not.toBeNull();
    expect(step!.winner.merged).toBe('aa');
    expect(state.splits.get('aa')).toEqual(['aa']);
    expect(state.splits.get('ab')).toEqual(['a', '##b']); // untouched — no "a ##a" pair in "ab"
    expect(state.vocab.has('aa')).toBe(true);
  });

  it('keeps the merged prefix marker from the left symbol', () => {
    // once "un" exists as a unit, merging it with "##happy"'s leading "##h" etc. should
    // stay word-initial ("un" has no ##, so "unh" shouldn't gain one either)
    const state = initTrainer([{ word: 'unhappy', count: 1 }]);
    // manually merge "u"+"##n" first so we have a "un" symbol to test the next merge with
    state.splits.set('unhappy', ['un', '##h', '##a', '##p', '##p', '##y']);
    state.vocab.add('un');
    const merged = trainStep(state); // highest-scoring pair among the rest, whichever it is
    expect(merged).not.toBeNull();
    // every symbol in the result should still correctly mark continuation vs. word-start
    const split = state.splits.get('unhappy')!;
    expect(split[0]!.startsWith('##')).toBe(false); // first piece is always word-initial
    for (const sym of split.slice(1)) expect(sym.startsWith('##')).toBe(true);
  });

  it('returns null once no pair remains anywhere', () => {
    const state = initTrainer([{ word: 'a', count: 1 }]);
    expect(trainStep(state)).toBeNull();
  });

  it('records step number and a bounded list of runner-up candidates', () => {
    const state = initTrainer([{ word: 'playing', count: 1 }]);
    const step = trainStep(state);
    expect(step!.step).toBe(1);
    expect(step!.candidates[0]).toEqual(step!.winner);
    expect(step!.candidates.length).toBeLessThanOrEqual(6);
  });

  it('is deterministic — training the same corpus twice gives the same merge order', () => {
    const corpus = [
      { word: 'play', count: 3 },
      { word: 'playing', count: 2 },
      { word: 'played', count: 2 },
      { word: 'player', count: 1 },
    ];
    const a = initTrainer(corpus);
    const b = initTrainer(corpus);
    const mergesA: string[] = [];
    const mergesB: string[] = [];
    for (let i = 0; i < 6; i++) {
      mergesA.push(trainStep(a)?.winner.merged ?? '');
      mergesB.push(trainStep(b)?.winner.merged ?? '');
    }
    expect(mergesA).toEqual(mergesB);
  });
});
