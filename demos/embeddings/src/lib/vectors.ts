/**
 * Everything the demo does with an embedding is in here, and it is all small:
 * dot products, a vector add/subtract, and a sort. No matrix library.
 *
 * A "vector" is just `number[]` — GloVe gives each word 50 of them.
 */

export type Vec = readonly number[];

export function dot(a: Vec, b: Vec): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

export function norm(a: Vec): number {
  return Math.sqrt(dot(a, a));
}

/**
 * Cosine similarity: the cosine of the angle between two vectors.
 *  1 = same direction, 0 = unrelated, -1 = opposite.
 * This is the standard "how similar are these two words" measure.
 */
export function cosineSimilarity(a: Vec, b: Vec): number {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
}

export function add(a: Vec, b: Vec): number[] {
  return a.map((x, i) => x + b[i]!);
}

export function sub(a: Vec, b: Vec): number[] {
  return a.map((x, i) => x - b[i]!);
}

/** Point a fraction `t` of the way from `a` to `b` (t = 0 → a, t = 1 → b). */
export function lerp(a: Vec, b: Vec, t: number): number[] {
  return a.map((x, i) => x + (b[i]! - x) * t);
}

/**
 * The analogy vector for "b is to a, as d is to ?": a − b + d.
 * e.g. analogy(king, man, woman) points near "queen".
 */
export function analogy(a: Vec, b: Vec, d: Vec): number[] {
  return add(sub(a, b), d);
}

export interface Neighbor {
  index: number;
  score: number;
}

/**
 * The `k` vectors most similar to `query`, most similar first.
 * `skip` indices (e.g. the query word itself) are left out.
 */
export function nearestNeighbors(
  query: Vec,
  vectors: readonly Vec[],
  k: number,
  skip: ReadonlySet<number> = new Set(),
): Neighbor[] {
  const scored: Neighbor[] = [];
  for (let i = 0; i < vectors.length; i++) {
    if (skip.has(i)) continue;
    scored.push({ index: i, score: cosineSimilarity(query, vectors[i]!) });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, k);
}

/**
 * Drop a 50-d vector onto the 2-D PCA layout: subtract the mean, then take the
 * dot product with each of the two stored PCA axes. `axes` is [2][dim].
 */
export function projectPCA(v: Vec, mean: Vec, axes: readonly Vec[]): [number, number] {
  const centred = sub(v, mean);
  return [dot(centred, axes[0]!), dot(centred, axes[1]!)];
}
