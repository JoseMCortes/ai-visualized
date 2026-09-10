/**
 * 2-D PCA so the high-dimensional word vectors can be drawn on a flat map,
 * plus a stabiliser that rotates a fresh projection to line up with the
 * previous one — otherwise the map would spin every time it's recomputed.
 */

export interface Projection {
  mean: number[];
  axes: [number[], number[]];
}

function normalize(v: number[]): void {
  const n = Math.hypot(...v) || 1;
  for (let i = 0; i < v.length; i++) v[i] = v[i]! / n;
}

/** Top principal direction of the centred rows, by power iteration; `avoid` is projected out. */
function principal(rows: number[][], d: number, avoid: number[] | null): number[] {
  let v = Array.from({ length: d }, (_, i) => Math.sin(i * 1.7 + 1));
  normalize(v);
  for (let iter = 0; iter < 60; iter++) {
    const w = new Array<number>(d).fill(0);
    for (const row of rows) {
      let proj = 0;
      for (let i = 0; i < d; i++) proj += row[i]! * v[i]!;
      for (let i = 0; i < d; i++) w[i] = w[i]! + proj * row[i]!;
    }
    if (avoid) {
      let p = 0;
      for (let i = 0; i < d; i++) p += w[i]! * avoid[i]!;
      for (let i = 0; i < d; i++) w[i] = w[i]! - p * avoid[i]!;
    }
    normalize(w);
    v = w;
  }
  return v;
}

export function pca2(vectors: number[][]): Projection {
  const n = vectors.length;
  const d = vectors[0]?.length ?? 0;
  const mean = new Array<number>(d).fill(0);
  for (const v of vectors) for (let i = 0; i < d; i++) mean[i] = mean[i]! + v[i]! / n;
  const centred = vectors.map((v) => v.map((x, i) => x - mean[i]!));
  const a0 = principal(centred, d, null);
  const a1 = principal(centred, d, a0);
  return { mean, axes: [a0, a1] };
}

export function project(vec: number[], p: Projection): [number, number] {
  let x = 0;
  let y = 0;
  for (let i = 0; i < vec.length; i++) {
    const c = vec[i]! - p.mean[i]!;
    x += c * p.axes[0][i]!;
    y += c * p.axes[1][i]!;
  }
  return [x, y];
}

/**
 * Rotate/flip `next` in its own plane so its projection of `vectors` best
 * matches `prev`'s (2-D orthogonal Procrustes). Returns the aligned projection.
 */
export function stabilize(
  next: Projection,
  prev: Projection | null,
  vectors: number[][],
): Projection {
  if (!prev) return next;
  const P = vectors.map((v) => project(v, next));
  const Q = vectors.map((v) => project(v, prev));

  // M = Pᵀ Q  (2x2)
  let m00 = 0;
  let m01 = 0;
  let m10 = 0;
  let m11 = 0;
  for (let k = 0; k < P.length; k++) {
    m00 += P[k]![0] * Q[k]![0];
    m01 += P[k]![0] * Q[k]![1];
    m10 += P[k]![1] * Q[k]![0];
    m11 += P[k]![1] * Q[k]![1];
  }
  // best rotation angle; also try the reflection and keep whichever fits better
  const rot = Math.atan2(m10 - m01, m00 + m11);
  const ref = Math.atan2(m10 + m01, m00 - m11);
  const fit = (a: number, reflect: boolean): number => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    let e = 0;
    for (let k = 0; k < P.length; k++) {
      const px = P[k]![0];
      const py = reflect ? -P[k]![1] : P[k]![1];
      const rx = c * px - s * py;
      const ry = s * px + c * py;
      e += (rx - Q[k]![0]) ** 2 + (ry - Q[k]![1]) ** 2;
    }
    return e;
  };
  const reflect = fit(ref, true) < fit(rot, false);
  const a = reflect ? ref : rot;
  const c = Math.cos(a);
  const s = Math.sin(a);

  const d = next.axes[0].length;
  const base1 = reflect ? next.axes[1].map((x) => -x) : next.axes[1];
  const ax0 = new Array<number>(d);
  const ax1 = new Array<number>(d);
  for (let i = 0; i < d; i++) {
    ax0[i] = c * next.axes[0][i]! - s * base1[i]!;
    ax1[i] = s * next.axes[0][i]! + c * base1[i]!;
  }
  return { mean: next.mean, axes: [ax0, ax1] };
}
