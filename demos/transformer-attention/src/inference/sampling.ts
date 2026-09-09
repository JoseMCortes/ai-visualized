/** Turning next-token logits into an actual next token. */

import { argmax, softmax } from './linalg';
import type { SamplingOptions } from './types';

/** Small seedable PRNG so a given seed reproduces a generation exactly. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SampleResult {
  id: number;
  /** Full softmax over the vocabulary AFTER temperature (before top-k / top-p). */
  probs: number[];
}

/**
 * Sample a token id from logits.
 *
 * 1. divide logits by `temperature` (lower = sharper, 0 = greedy argmax)
 * 2. softmax  -> a probability for every token (this is what the bars show)
 * 3. optionally keep only the top-K, then the smallest set summing to >= top-P
 * 4. draw one token from what's left, in proportion to its probability
 */
export function sampleFromLogits(
  logits: number[],
  opts: SamplingOptions,
  rng: () => number,
): SampleResult {
  const temperature = opts.temperature ?? 1;
  const topK = opts.topK ?? 0;
  const topP = opts.topP ?? 1;

  if (temperature <= 0) {
    return { id: argmax(logits), probs: softmax(logits) };
  }

  const probs = softmax(logits.map((x) => x / temperature));

  let order = [...probs.keys()].sort((a, b) => probs[b]! - probs[a]!);
  if (topK > 0) order = order.slice(0, topK);
  if (topP < 1) {
    const kept: number[] = [];
    let cum = 0;
    for (const i of order) {
      kept.push(i);
      cum += probs[i]!;
      if (cum >= topP) break;
    }
    order = kept;
  }

  let mass = 0;
  for (const i of order) mass += probs[i]!;
  let r = rng() * mass;
  for (const i of order) {
    r -= probs[i]!;
    if (r <= 0) return { id: i, probs };
  }
  return { id: order[order.length - 1]!, probs };
}
