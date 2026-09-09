import { describe, expect, it } from 'vitest';
import { addInPlace, argmax, geluTanh, layerNorm, linear, softmax } from './linalg';
import type { Tensor } from './types';

describe('linear', () => {
  it('computes x @ Wᵀ + b with PyTorch [out, in] layout', () => {
    // W = [[1, 2, 3], [4, 5, 6]] (out=2, in=3), b = [10, 20]
    const w: Tensor = { data: new Float32Array([1, 2, 3, 4, 5, 6]), shape: [2, 3] };
    const y = linear([[1, 0, -1]], w, new Float32Array([10, 20]));
    // row: [1*1 + 0*2 + -1*3 + 10, 1*4 + 0*5 + -1*6 + 20] = [8, 18]
    expect(y).toEqual([[8, 18]]);
  });
});

describe('layerNorm', () => {
  it('produces mean 0 / unit variance before scale and shift', () => {
    const c = 4;
    const [out] = layerNorm([[1, 2, 3, 4]], new Float32Array(c).fill(1), new Float32Array(c), 1e-5);
    const mean = out!.reduce((a, b) => a + b, 0) / c;
    const variance = out!.reduce((a, b) => a + (b - mean) ** 2, 0) / c;
    expect(mean).toBeCloseTo(0, 6);
    expect(variance).toBeCloseTo(1, 4);
  });

  it('applies weight and bias', () => {
    const c = 3;
    const [out] = layerNorm(
      [[0, 0, 0]],
      new Float32Array([2, 2, 2]),
      new Float32Array([5, 6, 7]),
      1e-5,
    );
    expect(out).toEqual([5, 6, 7]); // zero variance input -> only the bias survives
  });
});

describe('geluTanh', () => {
  it('passes through 0, saturates the tails', () => {
    const [row] = geluTanh([[0, -6, 6]]);
    expect(row![0]).toBeCloseTo(0, 6);
    expect(row![1]).toBeCloseTo(0, 3);
    expect(row![2]).toBeCloseTo(6, 3);
  });

  it('matches the reference value at x = 1', () => {
    const [row] = geluTanh([[1]]);
    expect(row![0]).toBeCloseTo(0.8411919, 6);
  });
});

describe('softmax', () => {
  it('sums to 1 and is shift-invariant', () => {
    const a = softmax([0, 1, 2]);
    const b = softmax([1000, 1001, 1002]);
    expect(a.reduce((x, y) => x + y, 0)).toBeCloseTo(1);
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 10));
  });
});

describe('addInPlace / argmax', () => {
  it('adds elementwise', () => {
    const a = [
      [1, 2],
      [3, 4],
    ];
    addInPlace(a, [
      [10, 20],
      [30, 40],
    ]);
    expect(a).toEqual([
      [11, 22],
      [33, 44],
    ]);
  });

  it('finds the index of the max', () => {
    expect(argmax([3, 1, 4, 1, 5, 9, 2])).toBe(5);
  });
});
