/** A plain-language sentence for what one training step just did. */

import type { Mat, Vec } from './matrix';
import { TOKENS } from './setup';

function frobeniusNorm(W: Mat): number {
  return Math.sqrt(W.reduce((sum, row) => sum + row.reduce((s, v) => s + v * v, 0), 0));
}

function pct(w: number): string {
  return `${Math.round(w * 100)}%`;
}

export function describeStep(
  before: Vec,
  loss: number,
  after: Vec,
  grads: { dWQ: Mat; dWK: Mat; dWV: Mat },
): string {
  const beforeStr = TOKENS.map((t, i) => `${t} ${pct(before[i]!)}`).join(', ');
  const afterStr = TOKENS.map((t, i) => `${t} ${pct(after[i]!)}`).join(', ');

  const deltas = TOKENS.map((t, i) => ({ token: t, delta: after[i]! - before[i]! }));
  const gained = deltas.reduce((a, b) => (b.delta > a.delta ? b : a));
  const lost = deltas.reduce((a, b) => (b.delta < a.delta ? b : a));

  const norms: [string, number][] = [
    ['W_Q', frobeniusNorm(grads.dWQ)],
    ['W_K', frobeniusNorm(grads.dWK)],
    ['W_V', frobeniusNorm(grads.dWV)],
  ];
  const [biggestMatrix] = norms.reduce((a, b) => (b[1] > a[1] ? b : a));

  return (
    `Before this step, "sat" split its attention ${beforeStr} — squared error ${loss.toFixed(3)} ` +
    `against the target. ${biggestMatrix} moved the most this step. After the update: ${afterStr} — ` +
    `"${gained.token}" gained the most, "${lost.token}" lost the most.`
  );
}
