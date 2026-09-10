import { describe, expect, it } from 'vitest';
import { SENTENCES, tokenize } from '../corpus';
import { dot, mulberry32, sigmoid, SkipGramTrainer, type Vec2 } from './skipgram';

const corpus = SENTENCES.map(tokenize);
const opts = { learningRate: 0.1, windowSize: 2, negatives: 4 };

describe('primitives', () => {
  it('sigmoid maps 0 -> 0.5 and saturates', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5);
    expect(sigmoid(10)).toBeGreaterThan(0.999);
    expect(sigmoid(-10)).toBeLessThan(0.001);
  });

  it('dot product', () => {
    expect(dot([1, 2], [3, 4])).toBe(11);
  });

  it('mulberry32 is deterministic per seed', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('SkipGramTrainer setup', () => {
  const t = new SkipGramTrainer(corpus, opts, 1);

  it('builds a vocabulary from the corpus', () => {
    for (const w of ['dog', 'cat', 'king', 'queen', 'bread', 'wine', 'crown']) {
      expect(t.vocab).toContain(w);
    }
    expect(t.vectors).toHaveLength(t.vocab.length);
    expect(t.vocab).not.toContain('the'); // corpus is telegraphic — no articles
  });

  it('peekPair matches the pair the next step trains on', () => {
    const peek = t.peekPair();
    const trace = t.runStep();
    expect(trace.location.sentenceIndex).toBe(peek.sentenceIndex);
    expect(trace.center.word).toBe(t.vocab[peek.centerId]);
    expect(trace.positive.word).toBe(t.vocab[peek.contextId]);
  });
});

describe('one step', () => {
  it('pulls the positive pair together and pushes negatives away', () => {
    const t = new SkipGramTrainer(corpus, opts, 3);
    const trace = t.runStep();

    const center = trace.center.before;
    // positive word moved so its alignment with the (pre-step) center grew
    const pos = trace.moves[1]!;
    const posAfter: Vec2 = [pos.before[0] + pos.delta[0], pos.before[1] + pos.delta[1]];
    expect(dot(center, posAfter)).toBeGreaterThan(dot(center, pos.before));

    // each negative moved so its alignment with the center shrank
    for (const neg of trace.moves.slice(2)) {
      const after: Vec2 = [neg.before[0] + neg.delta[0], neg.before[1] + neg.delta[1]];
      expect(dot(center, after)).toBeLessThan(dot(center, neg.before));
    }
  });

  it('reports a finite, positive loss and advances the counter', () => {
    const t = new SkipGramTrainer(corpus, opts, 4);
    const trace = t.runStep();
    expect(Number.isFinite(trace.loss)).toBe(true);
    expect(trace.loss).toBeGreaterThan(0);
    expect(t.step).toBe(1);
  });
});

describe('reset', () => {
  it('restores the same starting vectors for a seed and zeroes the counters', () => {
    const t = new SkipGramTrainer(corpus, opts, 7);
    const start = t.vectors.map((v): Vec2 => [v[0], v[1]]);
    for (let i = 0; i < 50; i++) t.runStep();
    t.reset();
    expect(t.step).toBe(0);
    expect(t.epoch).toBe(0);
    t.vectors.forEach((v, i) => {
      expect(v[0]).toBeCloseTo(start[i]![0]);
      expect(v[1]).toBeCloseTo(start[i]![1]);
    });
  });
});

describe('it actually learns', () => {
  it('same-topic words end up closer than cross-topic words', () => {
    const t = new SkipGramTrainer(corpus, { learningRate: 0.08, windowSize: 2, negatives: 5 }, 12);
    for (let i = 0; i < 6000; i++) t.runStep();

    const cos = (a: string, b: string): number => {
      const va = t.vector(a);
      const vb = t.vector(b);
      return dot(va, vb) / (Math.hypot(...va) * Math.hypot(...vb) || 1);
    };

    // court words vs. a food word
    const withinCourt = (cos('king', 'queen') + cos('king', 'throne') + cos('queen', 'crown')) / 3;
    const courtToFood = (cos('king', 'bread') + cos('queen', 'wine') + cos('throne', 'cheese')) / 3;
    expect(withinCourt).toBeGreaterThan(courtToFood);

    // animal words vs. a court word
    const withinAnimals = (cos('dog', 'cat') + cos('cat', 'mouse') + cos('lion', 'wolf')) / 3;
    const animalsToCourt = (cos('dog', 'king') + cos('cat', 'crown') + cos('wolf', 'throne')) / 3;
    expect(withinAnimals).toBeGreaterThan(animalsToCourt);
  });
});
