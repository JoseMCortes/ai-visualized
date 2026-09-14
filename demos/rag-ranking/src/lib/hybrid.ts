/**
 * Hybrid search: neither a purely lexical score (BM25) nor a purely semantic
 * one (cosine similarity) is complete on its own, so blend them.
 *
 * The two scores live on different scales (BM25 is an unbounded sum, cosine
 * is -1..1), so each is first min-max normalised to 0..1 *within the current
 * result set*, then combined with a single dial:
 *
 *   hybrid = alpha × normalised(BM25)  +  (1 − alpha) × normalised(cosine)
 *
 * alpha = 1 is pure lexical, alpha = 0 is pure semantic.
 */

export interface HybridInput {
  docId: string;
  bm25: number;
  cosine: number;
}

export interface HybridRow extends HybridInput {
  bm25Norm: number;
  cosineNorm: number;
  hybrid: number;
}

function minMax(values: number[]): (v: number) => number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  return (v) => (span > 1e-9 ? (v - lo) / span : 0);
}

export function hybridScores(rows: HybridInput[], alpha: number): HybridRow[] {
  const normBm25 = minMax(rows.map((r) => r.bm25));
  const normCos = minMax(rows.map((r) => r.cosine));
  return rows.map((r) => {
    const bm25Norm = normBm25(r.bm25);
    const cosineNorm = normCos(r.cosine);
    return { ...r, bm25Norm, cosineNorm, hybrid: alpha * bm25Norm + (1 - alpha) * cosineNorm };
  });
}
