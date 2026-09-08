/**
 * Minimal, dependency-free building blocks for scaled dot-product attention.
 *
 * These are written for clarity, not speed: the visualizer reads every
 * intermediate value (raw scores, scaled scores, softmax weights, output) out
 * of {@link scaledDotProductAttention} and draws it.
 */

export type Matrix = number[][];

/** Numerically stable softmax over a single vector. */
export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Standard matrix multiply: [m×k] · [k×n] -> [m×n]. */
export function matmul(a: Matrix, b: Matrix): Matrix {
  const rows = a.length;
  const inner = b.length;
  const cols = b[0]?.length ?? 0;
  const out: Matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = a[i][k];
      for (let j = 0; j < cols; j++) {
        out[i][j] += aik * b[k][j];
      }
    }
  }
  return out;
}

export function transpose(m: Matrix): Matrix {
  const rows = m.length;
  const cols = m[0]?.length ?? 0;
  const out: Matrix = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      out[j][i] = m[i][j];
    }
  }
  return out;
}

export interface AttentionResult {
  /** Raw Q·Kᵀ scores, before scaling. Shape [n_q, n_k]. */
  scores: Matrix;
  /** Scores divided by sqrt(d_k). Shape [n_q, n_k]. */
  scaledScores: Matrix;
  /** Row-wise softmax of the scaled scores — the attention pattern. */
  weights: Matrix;
  /** weights · V — the context vectors. Shape [n_q, d_v]. */
  output: Matrix;
}

/**
 * Scaled dot-product attention, as in "Attention Is All You Need".
 *
 * @param q query matrix, shape [n_q, d_k]
 * @param k key matrix,   shape [n_k, d_k]
 * @param v value matrix, shape [n_k, d_v]
 */
export function scaledDotProductAttention(q: Matrix, k: Matrix, v: Matrix): AttentionResult {
  const dK = q[0]?.length ?? 1;
  const scale = Math.sqrt(dK);
  const scores = matmul(q, transpose(k));
  const scaledScores = scores.map((row) => row.map((s) => s / scale));
  const weights = scaledScores.map(softmax);
  const output = matmul(weights, v);
  return { scores, scaledScores, weights, output };
}
