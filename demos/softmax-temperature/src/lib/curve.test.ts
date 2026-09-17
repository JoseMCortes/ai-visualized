import { describe, expect, it } from 'vitest';
import { buildCurves, sampleTemperatures } from './curve';

describe('sampleTemperatures', () => {
  it('produces the requested number of points, log-spaced between the bounds', () => {
    const ts = sampleTemperatures(0.1, 10, 5);
    expect(ts).toHaveLength(5);
    expect(ts[0]).toBeCloseTo(0.1, 6);
    expect(ts[4]).toBeCloseTo(10, 6);
    // log-spacing: consecutive ratios are constant
    const ratios = ts.slice(1).map((t, i) => t / ts[i]!);
    for (let i = 1; i < ratios.length; i++) expect(ratios[i]!).toBeCloseTo(ratios[0]!, 6);
  });

  it('is non-decreasing', () => {
    const ts = sampleTemperatures(0.05, 50, 20);
    for (let i = 1; i < ts.length; i++) expect(ts[i]!).toBeGreaterThan(ts[i - 1]!);
  });
});

describe('buildCurves', () => {
  const scores = [1.0, 8.5, 0.5, -1.0, 2.0, 0.0, -0.5];

  it('returns one curve per input entry, each with `steps` points', () => {
    const curves = buildCurves(scores, 0.05, 50, 30);
    expect(curves).toHaveLength(scores.length);
    for (const c of curves) expect(c.points).toHaveLength(30);
  });

  it('probabilities at each sampled T still sum to 1 across entries', () => {
    const curves = buildCurves(scores, 0.05, 50, 10);
    for (let i = 0; i < curves[0]!.points.length; i++) {
      const total = curves.reduce((sum, c) => sum + c.points[i]!.prob, 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });

  it('the argmax entry approaches 1 at the low-T end and 1/N at the high-T end', () => {
    const curves = buildCurves(scores, 0.001, 1000, 40);
    const argmax = scores.indexOf(Math.max(...scores));
    expect(curves[argmax]!.points[0]!.prob).toBeGreaterThan(0.99);
    for (const c of curves) {
      expect(c.points[c.points.length - 1]!.prob).toBeCloseTo(1 / scores.length, 2);
    }
  });
});
