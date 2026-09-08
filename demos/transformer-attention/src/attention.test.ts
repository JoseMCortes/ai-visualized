import { describe, expect, it } from 'vitest';
import { matmul, scaledDotProductAttention, softmax, transpose } from './attention';

describe('softmax', () => {
  it('produces a probability distribution', () => {
    const p = softmax([1, 2, 3]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(Math.min(...p)).toBeGreaterThan(0);
  });

  it('is shift-invariant (numerically stable)', () => {
    const a = softmax([0, 1, 2]);
    const b = softmax([1000, 1001, 1002]);
    a.forEach((x, i) => expect(x).toBeCloseTo(b[i]));
  });
});

describe('matmul / transpose', () => {
  it('multiplies compatible matrices', () => {
    expect(
      matmul(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ],
      ),
    ).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  it('transpose is its own inverse', () => {
    const m = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(transpose(transpose(m))).toEqual(m);
  });
});

describe('scaledDotProductAttention', () => {
  it('each attention row is a distribution', () => {
    const { weights, output } = scaledDotProductAttention(
      [
        [1, 0],
        [0, 1],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [1, 0],
        [0, 1],
        [0.5, 0.5],
      ],
    );
    weights.forEach((row) => expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1));
    expect(output).toHaveLength(2);
  });

  it('attends most to the matching key', () => {
    const { weights } = scaledDotProductAttention(
      [[10, 0]],
      [
        [10, 0],
        [0, 10],
      ],
      [
        [1, 0],
        [0, 1],
      ],
    );
    expect(weights[0][0]).toBeGreaterThan(weights[0][1]);
  });
});
