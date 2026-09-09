/** Pure helpers for pulling one attention matrix out of a forward trace. */

import type { ForwardTrace } from '../inference/types';

export type HeadSelection = number | 'mean';

/**
 * The [query][key] weight matrix for one layer and either one head or the
 * mean over all heads. Rows are causal: entry [i][j] is 0 for j > i.
 */
export function attentionMatrix(
  trace: ForwardTrace,
  layer: number,
  head: HeadSelection,
): number[][] {
  const heads = trace.attention[layer];
  if (!heads) throw new Error(`no layer ${layer} in trace`);

  if (head !== 'mean') {
    const m = heads[head];
    if (!m) throw new Error(`no head ${head} in layer ${layer}`);
    return m;
  }

  const t = heads[0]!.length;
  const out = Array.from({ length: t }, () => new Array<number>(t).fill(0));
  for (const h of heads) {
    for (let i = 0; i < t; i++) {
      for (let j = 0; j <= i; j++) out[i]![j] += h[i]![j]! / heads.length;
    }
  }
  return out;
}

/** Largest weight in a matrix, for scaling the visual intensity. */
export function maxWeight(matrix: number[][]): number {
  let m = 0;
  for (const row of matrix) for (const v of row) if (v > m) m = v;
  return m || 1;
}

/**
 * The scaled-dot-product scores (qᵢ·kⱼ/√dₖ, before softmax) for one layer and
 * head, or averaged over heads. Masked positions stay NaN.
 */
export function scoreMatrix(trace: ForwardTrace, layer: number, head: HeadSelection): number[][] {
  const heads = trace.scores[layer];
  if (!heads) throw new Error(`no layer ${layer} in trace`);
  if (head !== 'mean') {
    const m = heads[head];
    if (!m) throw new Error(`no head ${head} in layer ${layer}`);
    return m;
  }
  const t = heads[0]!.length;
  const out = Array.from({ length: t }, () => new Array<number>(t).fill(NaN));
  for (let i = 0; i < t; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (const h of heads) sum += h[i]![j]!;
      out[i]![j] = sum / heads.length;
    }
  }
  return out;
}
