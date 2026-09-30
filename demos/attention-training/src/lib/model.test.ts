import { describe, expect, it } from 'vitest';
import { backward, forward } from './model';
import { EMBEDDINGS, INITIAL_WK, INITIAL_WQ, INITIAL_WV, QUERY_INDEX, TARGET } from './setup';

/**
 * Every expected value below was produced by running the user's own PyTorch
 * reference implementation on this exact example and printing full
 * precision — not re-derived by hand. If this from-scratch implementation
 * ever disagrees with real autograd, these tests catch it.
 */

describe('forward', () => {
  const fwd = forward(EMBEDDINGS, QUERY_INDEX, INITIAL_WQ, INITIAL_WK, INITIAL_WV);

  it('computes q = x_sat · W_Q', () => {
    expect(fwd.q).toEqual([0.5, 0.25, 1.25]);
  });

  it('computes K and V for every token', () => {
    expect(fwd.K).toEqual([
      [1, 0, 0],
      [0, 1.25, 0.25],
      [0, 1, 0.5],
    ]);
    expect(fwd.V).toEqual([
      [0.5, 0, 0],
      [0, 1, 0.25],
      [0, 0.5, 0.5],
    ]);
  });

  it('scales scores by 1/√d before softmax', () => {
    expect(fwd.scores[0]).toBeCloseTo(0.288675, 5);
    expect(fwd.scores[1]).toBeCloseTo(0.360844, 5);
    expect(fwd.scores[2]).toBeCloseTo(0.505181, 5);
  });

  it('produces attention weights that sum to 1, matching PyTorch softmax', () => {
    expect(fwd.weights[0]).toBeCloseTo(0.301517, 5);
    expect(fwd.weights[1]).toBeCloseTo(0.324081, 5);
    expect(fwd.weights[2]).toBeCloseTo(0.374402, 5);
    expect(fwd.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("matches PyTorch's output vector", () => {
    expect(fwd.output[0]).toBeCloseTo(0.150758, 5);
    expect(fwd.output[1]).toBeCloseTo(0.511282, 5);
    expect(fwd.output[2]).toBeCloseTo(0.268221, 5);
  });
});

describe('backward', () => {
  const fwd = forward(EMBEDDINGS, QUERY_INDEX, INITIAL_WQ, INITIAL_WK, INITIAL_WV);
  const bwd = backward(EMBEDDINGS, QUERY_INDEX, fwd, TARGET);

  it("matches PyTorch's loss", () => {
    expect(bwd.loss).toBeCloseTo(0.315294, 5);
  });

  it("matches PyTorch's dL/dW_Q — including the all-zero first row", () => {
    // sat's first feature is 0, so that row can't have moved (±0 — a harmless float artifact)
    bwd.dWQ[0]!.forEach((v) => expect(v).toBeCloseTo(0, 10));
    expect(bwd.dWQ[1]![0]).toBeCloseTo(0.063486, 5);
    expect(bwd.dWQ[1]![1]).toBeCloseTo(-0.075524, 5);
    expect(bwd.dWQ[1]![2]).toBeCloseTo(-0.019705, 5);
    expect(bwd.dWQ[2]![0]).toBeCloseTo(0.126972, 5);
    expect(bwd.dWQ[2]![1]).toBeCloseTo(-0.151048, 5);
    expect(bwd.dWQ[2]![2]).toBeCloseTo(-0.03941, 5);
  });

  it("matches PyTorch's dL/dW_K", () => {
    expect(bwd.dWK[0]![0]).toBeCloseTo(0.063486, 5);
    expect(bwd.dWK[0]![1]).toBeCloseTo(0.031743, 5);
    expect(bwd.dWK[0]![2]).toBeCloseTo(0.158714, 5);
    expect(bwd.dWK[1]![0]).toBeCloseTo(-0.055819, 5);
    expect(bwd.dWK[2]![2]).toBeCloseTo(-0.098524, 5);
  });

  it("matches PyTorch's dL/dW_V — the largest gradient, since V feeds the output directly", () => {
    expect(bwd.dWV[0]![0]).toBeCloseTo(0.090912, 5);
    expect(bwd.dWV[1]![1]).toBeCloseTo(-0.499745, 5);
    expect(bwd.dWV[2]![2]).toBeCloseTo(-0.248672, 5);
  });
});

describe('one full training step, checked against PyTorch step 1', () => {
  it('produces the exact post-update attention weights and loss PyTorch printed', () => {
    const fwd0 = forward(EMBEDDINGS, QUERY_INDEX, INITIAL_WQ, INITIAL_WK, INITIAL_WV);
    const bwd0 = backward(EMBEDDINGS, QUERY_INDEX, fwd0, TARGET);
    const lr = 0.5;
    const applyGrad = (W: number[][], dW: number[][]) =>
      W.map((row, i) => row.map((v, j) => v - lr * dW[i]![j]!));

    const WQ1 = applyGrad(INITIAL_WQ, bwd0.dWQ);
    const WK1 = applyGrad(INITIAL_WK, bwd0.dWK);
    const WV1 = applyGrad(INITIAL_WV, bwd0.dWV);

    const fwd1 = forward(EMBEDDINGS, QUERY_INDEX, WQ1, WK1, WV1);
    const bwd1 = backward(EMBEDDINGS, QUERY_INDEX, fwd1, TARGET);

    expect(fwd1.weights[0]).toBeCloseTo(0.249908, 5);
    expect(fwd1.weights[1]).toBeCloseTo(0.351577, 5);
    expect(fwd1.weights[2]).toBeCloseTo(0.398515, 5);
    expect(bwd1.loss).toBeCloseTo(0.019465, 5);
  });
});
