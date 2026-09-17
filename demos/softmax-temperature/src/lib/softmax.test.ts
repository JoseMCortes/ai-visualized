import { describe, expect, it } from 'vitest';
import { softmaxWithTemperature } from './softmax';

const scores = [1.0, 8.5, 0.5, -1.0, 2.0, 0.0, -0.5];

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

describe('softmaxWithTemperature', () => {
  it('always produces a valid probability distribution', () => {
    for (const t of [0.01, 0.1, 0.5, 1, 2, 10, 100]) {
      const { rows } = softmaxWithTemperature(scores, t);
      expect(sum(rows.map((r) => r.prob))).toBeCloseTo(1, 6);
      for (const r of rows) {
        expect(r.prob).toBeGreaterThanOrEqual(0);
        expect(r.prob).toBeLessThanOrEqual(1);
      }
    }
  });

  it('T = 1 matches plain softmax', () => {
    const { rows } = softmaxWithTemperature(scores, 1);
    const maxRaw = Math.max(...scores);
    const expected = scores.map((s) => Math.exp(s - maxRaw));
    const total = sum(expected);
    rows.forEach((r, i) => expect(r.prob).toBeCloseTo(expected[i]! / total, 10));
  });

  it('as T -> 0, the distribution collapses onto the argmax (one-hot)', () => {
    const { rows, argmax, entropy } = softmaxWithTemperature(scores, 0.001);
    expect(argmax).toBe(1); // index of 8.5, the largest score
    expect(rows[argmax]!.prob).toBeGreaterThan(0.999);
    expect(entropy).toBeLessThan(0.01);
  });

  it('as T -> infinity, the distribution approaches uniform', () => {
    const { rows, entropy, maxEntropy } = softmaxWithTemperature(scores, 1e6);
    const uniform = 1 / scores.length;
    for (const r of rows) expect(r.prob).toBeCloseTo(uniform, 3);
    expect(entropy).toBeCloseTo(maxEntropy, 3);
  });

  it('entropy stays within [0, ln(N)] and grows monotonically with T', () => {
    const temps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 50];
    const entropies = temps.map((t) => softmaxWithTemperature(scores, t).entropy);
    const maxEntropy = Math.log(scores.length);
    for (const e of entropies) {
      expect(e).toBeGreaterThanOrEqual(-1e-9);
      expect(e).toBeLessThanOrEqual(maxEntropy + 1e-9);
    }
    for (let i = 1; i < entropies.length; i++) {
      expect(entropies[i]!).toBeGreaterThanOrEqual(entropies[i - 1]! - 1e-9);
    }
  });

  it('argmax is stable across every temperature (T only reshapes, never reorders)', () => {
    for (const t of [0.01, 0.5, 1, 5, 100]) {
      expect(softmaxWithTemperature(scores, t).argmax).toBe(1);
    }
  });

  it('is numerically stable at very low T (no NaN/Infinity)', () => {
    const { rows } = softmaxWithTemperature(scores, 1e-8);
    for (const r of rows) {
      expect(Number.isFinite(r.prob)).toBe(true);
      expect(Number.isFinite(r.expValue)).toBe(true);
    }
  });

  it('a flat input vector is uniform at every temperature', () => {
    const flat = [2, 2, 2, 2];
    for (const t of [0.1, 1, 10]) {
      const { rows } = softmaxWithTemperature(flat, t);
      for (const r of rows) expect(r.prob).toBeCloseTo(0.25, 6);
    }
  });
});
