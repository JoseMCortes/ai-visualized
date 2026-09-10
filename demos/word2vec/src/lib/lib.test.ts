import { describe, expect, it } from 'vitest';
import { pca2, project, stabilize } from './pca';
import { prepare, splitSentences, tokenize } from './preprocess';
import { Word2VecTrainer, dot } from './trainer';
import { kmeans } from './kmeans';

describe('preprocess', () => {
  it('tokenises and splits sentences', () => {
    expect(tokenize('The Cat, sat! on—the MAT.')).toEqual([
      'the',
      'cat',
      'sat',
      'on',
      'the',
      'mat',
    ]);
    expect(splitSentences('One thing. Two things! Three?')).toHaveLength(3);
  });

  it('drops stop-words, keeps the most frequent content words, maps to ids', () => {
    const text =
      'the fox and the wolf. the fox saw the wolf. a fox chased a rabbit. the wolf and the fox.';
    const p = prepare(text, { vocabSize: 5, minCount: 2, subsample: 0, seed: 1 });
    expect(p.vocab).toContain('fox');
    expect(p.vocab).toContain('wolf');
    expect(p.vocab).not.toContain('the');
    expect(p.vocab).not.toContain('and');
    // every id in every sentence is a valid vocab index
    for (const s of p.sentences) for (const id of s) expect(p.vocab[id]).toBeTypeOf('string');
  });
});

describe('Word2VecTrainer', () => {
  const text =
    'cat dog cat dog pet. dog cat pet dog. sun moon star sky. moon star sun sky night. ' +
    'cat pet dog pet. star sky moon night sun.';
  const p = prepare(text, { vocabSize: 12, minCount: 1, subsample: 0, seed: 1 });
  const t = new Word2VecTrainer(
    p.sentences,
    p.vocab,
    p.counts,
    { learningRate: 0.1, windowSize: 3, negatives: 3 },
    1,
    8,
  );

  it('has 8-dimensional vectors and a non-empty pair list', () => {
    expect(t.dim).toBe(8);
    expect(t.vectors[0]).toHaveLength(8);
    expect(t.pairCount).toBeGreaterThan(0);
  });

  it('a step advances the counter and returns a finite loss', () => {
    const tr = t.runStep();
    expect(t.step).toBe(1);
    expect(Number.isFinite(tr.loss)).toBe(true);
  });

  it('learns: words in the same sentences end up more similar', () => {
    const t2 = new Word2VecTrainer(
      p.sentences,
      p.vocab,
      p.counts,
      { learningRate: 0.1, windowSize: 3, negatives: 4 },
      2,
      8,
    );
    for (let i = 0; i < 8000; i++) t2.runStep();
    const cos = (a: string, b: string): number => {
      const va = t2.vector(a);
      const vb = t2.vector(b);
      return dot(va, vb) / (Math.hypot(...va) * Math.hypot(...vb) || 1);
    };
    expect(cos('cat', 'dog')).toBeGreaterThan(cos('cat', 'moon'));
    expect(cos('sun', 'moon')).toBeGreaterThan(cos('sun', 'cat'));
  });

  it('reset restores the starting vectors and zeroes the counters', () => {
    const before = t.vector(t.vocab[0]!).slice();
    for (let i = 0; i < 20; i++) t.runStep();
    t.reset();
    expect(t.step).toBe(0);
    t.vector(t.vocab[0]!).forEach((x, i) => expect(x).toBeCloseTo(before[i]!));
  });
});

describe('pca2 / project / stabilize', () => {
  it('projects onto the direction of most variance', () => {
    // points strung along the x-ish axis in 3-D
    const pts = [
      [-2, 0, 0],
      [-1, 0.1, 0],
      [0, -0.1, 0],
      [1, 0.05, 0],
      [2, 0, 0],
    ];
    const p = pca2(pts);
    const xs = pts.map((v) => project(v, p)[0]);
    expect(Math.abs(xs[0]!)).toBeGreaterThan(1); // spread preserved on axis 0
    expect(xs[0]! * xs[4]! < 0).toBe(true); // ends on opposite sides
  });

  it('stabilise keeps a re-projection lined up with the previous one', () => {
    const a = [
      [1, 2, 0, 1],
      [-1, 0, 2, 0],
      [0, -2, -1, 1],
      [2, 1, 1, -1],
      [-2, 1, -1, 0],
    ];
    const p1 = pca2(a);
    // perturb slightly and re-project
    const b = a.map((v) => v.map((x) => x + (Math.random() - 0.5) * 0.01));
    const p2 = stabilize(pca2(b), p1, b);
    let drift = 0;
    for (let i = 0; i < a.length; i++) {
      const q1 = project(a[i]!, p1);
      const q2 = project(b[i]!, p2);
      drift += Math.hypot(q1[0] - q2[0], q1[1] - q2[1]);
    }
    expect(drift / a.length).toBeLessThan(0.2);
  });
});

describe('kmeans', () => {
  it('separates two obvious blobs', () => {
    const pts: [number, number][] = [
      [0, 0],
      [0.1, -0.1],
      [-0.1, 0.1],
      [10, 10],
      [10.1, 9.9],
      [9.9, 10.1],
    ];
    const a = kmeans(pts, 2, 1);
    expect(a[0]).toBe(a[1]);
    expect(a[0]).toBe(a[2]);
    expect(a[3]).toBe(a[4]);
    expect(a[0]).not.toBe(a[3]);
  });
});
