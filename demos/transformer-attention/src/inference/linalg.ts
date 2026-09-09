/**
 * The handful of numeric operations the GPT forward pass needs, written plainly.
 *
 * Activations are `number[][]` shaped [T][features] (T = sequence length). They
 * are small here (T <= 128, features <= 512), so readable nested loops are fast
 * enough — a full forward pass is a few milliseconds.
 *
 * Weight matrices follow PyTorch's `nn.Linear` convention: a weight of shape
 * [out, in] stored row-major, computing  y = x @ Wᵀ + b.
 */

import type { Tensor } from './types';

/** y[t][o] = b[o] + Σ_i x[t][i] · W[o][i].  W: [out, in] row-major. */
export function linear(x: number[][], w: Tensor, bias: Float32Array | null): number[][] {
  const [outDim, inDim] = w.shape;
  const wd = w.data;
  const out: number[][] = new Array(x.length);
  for (let t = 0; t < x.length; t++) {
    const xt = x[t]!;
    const row = new Array<number>(outDim);
    for (let o = 0; o < outDim; o++) {
      let acc = bias ? bias[o]! : 0;
      const base = o * inDim;
      for (let i = 0; i < inDim; i++) acc += xt[i]! * wd[base + i]!;
      row[o] = acc;
    }
    out[t] = row;
  }
  return out;
}

/**
 * LayerNorm over the last axis: subtract the mean, divide by the standard
 * deviation (population variance, + eps), then scale and shift.
 */
export function layerNorm(
  x: number[][],
  weight: Float32Array,
  bias: Float32Array,
  eps: number,
): number[][] {
  return x.map((xt) => {
    const c = xt.length;
    let mean = 0;
    for (let i = 0; i < c; i++) mean += xt[i]!;
    mean /= c;
    let variance = 0;
    for (let i = 0; i < c; i++) {
      const d = xt[i]! - mean;
      variance += d * d;
    }
    variance /= c;
    const invStd = 1 / Math.sqrt(variance + eps);
    const out = new Array<number>(c);
    for (let i = 0; i < c; i++) out[i] = (xt[i]! - mean) * invStd * weight[i]! + bias[i]!;
    return out;
  });
}

/** GELU, tanh approximation (matches `training/model.py`). */
export function geluTanh(x: number[][]): number[][] {
  const k = Math.sqrt(2 / Math.PI);
  return x.map((xt) => xt.map((v) => 0.5 * v * (1 + Math.tanh(k * (v + 0.044715 * v * v * v)))));
}

/** Numerically stable softmax of a single vector. */
export function softmax(v: number[]): number[] {
  let max = -Infinity;
  for (const x of v) if (x > max) max = x;
  let sum = 0;
  const out = v.map((x) => {
    const e = Math.exp(x - max);
    sum += e;
    return e;
  });
  return out.map((e) => e / sum);
}

/** a[t][i] += b[t][i], in place. Used for residual connections. */
export function addInPlace(a: number[][], b: number[][]): void {
  for (let t = 0; t < a.length; t++) {
    const at = a[t]!;
    const bt = b[t]!;
    for (let i = 0; i < at.length; i++) at[i] += bt[i]!;
  }
}

export function argmax(v: number[] | Float32Array): number {
  let best = 0;
  for (let i = 1; i < v.length; i++) if (v[i]! > v[best]!) best = i;
  return best;
}
