import { describe, expect, it } from 'vitest';
import type { ForwardTrace } from '../inference/types';
import { attentionMatrix, maxWeight } from './attentionData';
import { accent, arcPath, clamp, emphasize } from './geometry';
import { glyph } from './glyph';
import { topProbabilities } from './probBars';
import { scoreMatrix } from './attentionData';
import { topKeysByWeight } from './computeSteps';

function trace(): ForwardTrace {
  return {
    ids: [0, 1],
    nLayer: 1,
    nHead: 2,
    attention: [
      [
        [
          [1, 0],
          [0.5, 0.5],
        ],
        [
          [1, 0],
          [0.2, 0.8],
        ],
      ],
    ],
    scores: [
      [
        [
          [0, NaN],
          [0.1, 0.1],
        ],
        [
          [0, NaN],
          [-0.5, 0.9],
        ],
      ],
    ],
    residual: [],
    logits: [
      [0, 0],
      [0, 0],
    ],
  };
}

describe('attentionMatrix', () => {
  it('returns the requested head', () => {
    expect(attentionMatrix(trace(), 0, 1)).toEqual([
      [1, 0],
      [0.2, 0.8],
    ]);
  });

  it('averages the heads for "mean"', () => {
    const m = attentionMatrix(trace(), 0, 'mean');
    expect(m[1]![0]).toBeCloseTo(0.35);
    expect(m[1]![1]).toBeCloseTo(0.65);
  });

  it('mean rows still sum to 1 and stay causal', () => {
    const m = attentionMatrix(trace(), 0, 'mean');
    expect(m[0]![1]).toBe(0);
    m.forEach((row) => expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1));
  });
});

describe('geometry', () => {
  it('emphasize is monotonic and pinned at 0 and 1', () => {
    expect(emphasize(0)).toBe(0);
    expect(emphasize(1)).toBe(1);
    expect(emphasize(0.25)).toBeGreaterThan(0.25); // gamma < 1 lifts small weights
  });

  it('clamp bounds the value', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });

  it('accent emits an rgba string', () => {
    expect(accent(0.5)).toMatch(/^rgba\(79, 70, 229, 0\.500\)$/);
  });

  it('arcPath is a quadratic Bézier between the two x positions', () => {
    const d = arcPath(10, 90, 100, 96);
    expect(d.startsWith('M 10.0 100')).toBe(true);
    expect(d).toContain('Q ');
    expect(d.trimEnd().endsWith('90.0 100')).toBe(true);
  });
});

describe('maxWeight / glyph', () => {
  it('maxWeight never returns 0', () => {
    expect(
      maxWeight([
        [0, 0],
        [0, 0],
      ]),
    ).toBe(1);
    expect(
      maxWeight([
        [0.1, 0.4],
        [0.9, 0],
      ]),
    ).toBeCloseTo(0.9);
  });

  it('glyph makes whitespace visible', () => {
    expect(glyph(' ')).toBe('␣');
    expect(glyph('\n')).toBe('⏎');
    expect(glyph('x')).toBe('x');
  });
});

describe('scoreMatrix', () => {
  it('returns the scaled scores for one head, NaN where masked', () => {
    const m = scoreMatrix(trace(), 0, 1);
    expect(m[1]).toEqual([-0.5, 0.9]);
    expect(Number.isNaN(m[0]![1]!)).toBe(true);
  });

  it('averages heads for "mean" and leaves masked entries NaN', () => {
    const m = scoreMatrix(trace(), 0, 'mean');
    expect(m[1]![0]).toBeCloseTo((0.1 + -0.5) / 2);
    expect(Number.isNaN(m[0]![1]!)).toBe(true);
  });
});

describe('topKeysByWeight', () => {
  it('returns key indices by descending weight, skipping zeros', () => {
    expect(topKeysByWeight([0.1, 0, 0.6, 0.3], 4)).toEqual([2, 3, 0]);
  });

  it('caps at k', () => {
    expect(topKeysByWeight([0.4, 0.3, 0.2, 0.1], 2)).toEqual([0, 1]);
  });
});

describe('topProbabilities', () => {
  it('returns the k largest, highest first, with ids', () => {
    const top = topProbabilities([0.1, 0.5, 0.2, 0.05, 0.15], 3);
    expect(top.map((t) => t.id)).toEqual([1, 2, 4]);
    expect(top[0]!.p).toBeCloseTo(0.5);
  });

  it('clamps k to the available length and to zero', () => {
    expect(topProbabilities([0.4, 0.6], 10)).toHaveLength(2);
    expect(topProbabilities([0.4, 0.6], -1)).toHaveLength(0);
  });
});
