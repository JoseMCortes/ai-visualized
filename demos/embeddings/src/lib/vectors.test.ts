import { describe, expect, it } from 'vitest';
import {
  add,
  analogy,
  cosineSimilarity,
  dot,
  lerp,
  nearestNeighbors,
  norm,
  projectPCA,
  sub,
} from './vectors';

describe('dot / norm', () => {
  it('computes the dot product', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
  it('computes the Euclidean length', () => {
    expect(norm([3, 4])).toBe(5);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for the same direction, -1 for opposite, 0 for orthogonal', () => {
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it('ignores magnitude', () => {
    expect(cosineSimilarity([3, 0], [0.1, 0])).toBeCloseTo(1);
  });
  it('is 0 when a vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('add / sub / lerp / analogy', () => {
  it('adds and subtracts elementwise', () => {
    expect(add([1, 2], [3, 4])).toEqual([4, 6]);
    expect(sub([3, 4], [1, 2])).toEqual([2, 2]);
  });
  it('lerp interpolates between the endpoints', () => {
    expect(lerp([0, 0], [10, 20], 0)).toEqual([0, 0]);
    expect(lerp([0, 0], [10, 20], 1)).toEqual([10, 20]);
    expect(lerp([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
  });
  it('analogy(a, b, d) = a - b + d', () => {
    // toy "king - man + woman"
    expect(analogy([5, 5], [3, 1], [1, 4])).toEqual([3, 8]);
  });
});

describe('nearestNeighbors', () => {
  const vectors = [
    [1, 0], // 0
    [0.9, 0.1], // 1  — close to a query near (1, 0)
    [0, 1], // 2
    [-1, 0], // 3
  ];

  it('ranks by cosine similarity, closest first', () => {
    const n = nearestNeighbors([1, 0], vectors, 3);
    expect(n.map((x) => x.index)).toEqual([0, 1, 2]);
    expect(n[0]!.score).toBeCloseTo(1);
  });

  it('skips the given indices', () => {
    const n = nearestNeighbors([1, 0], vectors, 2, new Set([0]));
    expect(n.map((x) => x.index)).toEqual([1, 2]);
  });

  it('caps at k', () => {
    expect(nearestNeighbors([1, 0], vectors, 1)).toHaveLength(1);
  });
});

describe('projectPCA', () => {
  it('centres then dots with each axis', () => {
    const mean = [1, 1, 1];
    const axes = [
      [1, 0, 0],
      [0, 1, 0],
    ];
    expect(projectPCA([4, 3, 9], mean, axes)).toEqual([3, 2]);
  });
});
