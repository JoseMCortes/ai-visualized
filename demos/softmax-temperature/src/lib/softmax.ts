/**
 * Softmax with temperature: turn a list of raw scores into a probability
 * distribution, with one dial controlling how sharp or flat it is.
 *
 *   scaled_i  = x_i / T
 *   prob_i    = exp(scaled_i) / Σ_j exp(scaled_j)
 *
 * T = 1 is plain softmax. As T → 0, dividing by a tiny number stretches the
 * gaps between scores until the largest one swallows all the probability —
 * softmax approaches "pick the argmax". As T → ∞, every score gets divided
 * down toward 0, exp(0) = 1 for all of them, and the distribution approaches
 * uniform — every option equally likely regardless of its original score.
 *
 * Implemented the numerically stable way: subtract the max scaled value
 * before exponentiating, which cannot change the result (it cancels in the
 * ratio) but keeps exp() from overflowing at very small T.
 */

export interface SoftmaxRow {
  index: number;
  score: number; // raw x_i
  scaled: number; // x_i / T
  expValue: number; // exp(scaled_i - max), the stabilised numerator
  prob: number;
}

export interface SoftmaxResult {
  temperature: number;
  rows: SoftmaxRow[];
  /** Shannon entropy of the distribution, in nats: -Σ p·ln(p). 0 = one-hot, ln(N) = uniform. */
  entropy: number;
  maxEntropy: number;
  argmax: number;
}

export function softmaxWithTemperature(scores: number[], temperature: number): SoftmaxResult {
  const n = scores.length;
  const t = Math.max(temperature, 1e-6); // guard against divide-by-zero; the UI clamps well above this
  const scaled = scores.map((x) => x / t);
  const maxScaled = Math.max(...scaled);
  const expValues = scaled.map((s) => Math.exp(s - maxScaled));
  const sum = expValues.reduce((a, b) => a + b, 0);
  const probs = expValues.map((e) => e / sum);

  let entropy = 0;
  for (const p of probs) if (p > 1e-12) entropy -= p * Math.log(p);

  let argmax = 0;
  for (let i = 1; i < n; i++) if (scores[i]! > scores[argmax]!) argmax = i;

  const rows: SoftmaxRow[] = scores.map((score, i) => ({
    index: i,
    score,
    scaled: scaled[i]!,
    expValue: expValues[i]!,
    prob: probs[i]!,
  }));

  return { temperature: t, rows, entropy, maxEntropy: Math.log(n), argmax };
}
