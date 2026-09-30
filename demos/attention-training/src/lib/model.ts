/**
 * One attention head, from scratch: a forward pass, a hand-derived backward
 * pass (no autograd), and a gradient-descent update — the same three
 * matrices real transformers learn, on a toy example small enough to watch
 * every number.
 *
 * Forward: project the query token through W_Q; project every token through
 * W_K and W_V; score the query against every key (scaled by 1/√d, same as
 * real transformers, so the dot products don't grow with dimension);
 * softmax those scores into attention weights; take their weighted sum of
 * the values as the output.
 *
 * Backward was derived by hand and checked against PyTorch's autograd on
 * this exact example (see the "check it yourself" panel) — every gradient
 * matches to the last printed digit.
 */

import {
  dot,
  matMatMul,
  outer,
  softmax,
  transposeMatMul,
  vecMatMul,
  type Mat,
  type Vec,
} from './matrix';

export interface ForwardResult {
  q: Vec; // query vector for the query token
  K: Mat; // key vectors, one row per token
  V: Mat; // value vectors, one row per token
  scores: Vec; // q·k / √d, one per token, before softmax
  weights: Vec; // softmax(scores) — the attention weights
  output: Vec; // the weighted sum of V — what the query token "gathers"
}

export function forward(X: Mat, queryIndex: number, WQ: Mat, WK: Mat, WV: Mat): ForwardResult {
  const q = vecMatMul(X[queryIndex]!, WQ);
  const K = matMatMul(X, WK);
  const V = matMatMul(X, WV);
  const d = WQ.length;
  const sqrtD = Math.sqrt(d);
  const scores = K.map((k) => dot(q, k) / sqrtD);
  const weights = softmax(scores);
  const output = new Array(V[0]!.length).fill(0) as Vec;
  weights.forEach((w, i) => V[i]!.forEach((v, j) => (output[j]! += w * v)));
  return { q, K, V, scores, weights, output };
}

export interface BackwardResult {
  loss: number;
  dWQ: Mat;
  dWK: Mat;
  dWV: Mat;
}

export function backward(
  X: Mat,
  queryIndex: number,
  fwd: ForwardResult,
  target: Vec,
): BackwardResult {
  const { q, K, V, weights, output } = fwd;
  const d = q.length;
  const sqrtD = Math.sqrt(d);

  const loss = output.reduce((sum, o, j) => sum + (o - target[j]!) ** 2, 0);

  // dL/dOutput, then straight back through the weighted sum to dL/dWeights and dL/dV
  const dOut = output.map((o, j) => 2 * (o - target[j]!));
  const dWeights = V.map((vi) => dot(dOut, vi));
  const dV = weights.map((wi) => dOut.map((d0) => wi * d0));

  // softmax backward: dScores[i] = weights[i] * (dWeights[i] - Σ_k dWeights[k]*weights[k])
  const s = dWeights.reduce((sum, dwi, i) => sum + dwi * weights[i]!, 0);
  const dScores = weights.map((wi, i) => wi * (dWeights[i]! - s));

  // scores[i] = dot(q, K[i]) / √d, so this splits between dQ and dK
  const dQ = new Array(d).fill(0) as Vec;
  for (let i = 0; i < K.length; i++) {
    for (let j = 0; j < d; j++) dQ[j]! += (dScores[i]! * K[i]![j]!) / sqrtD;
  }
  const dK = dScores.map((dsi) => q.map((qj) => (dsi * qj) / sqrtD));

  // and finally through the three linear projections back to the weight matrices
  const dWQ = outer(X[queryIndex]!, dQ);
  const dWK = transposeMatMul(X, dK);
  const dWV = transposeMatMul(X, dV);

  return { loss, dWQ, dWK, dWV };
}
