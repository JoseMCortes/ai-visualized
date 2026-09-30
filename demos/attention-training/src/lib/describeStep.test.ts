import { describe, expect, it } from 'vitest';
import { backward, forward } from './model';
import { describeStep } from './describeStep';
import { EMBEDDINGS, INITIAL_WK, INITIAL_WQ, INITIAL_WV, QUERY_INDEX, TARGET } from './setup';

describe('describeStep', () => {
  it('names W_V as the biggest mover on the very first step, matching the worked example', () => {
    const fwd = forward(EMBEDDINGS, QUERY_INDEX, INITIAL_WQ, INITIAL_WK, INITIAL_WV);
    const bwd = backward(EMBEDDINGS, QUERY_INDEX, fwd, TARGET);
    const after = [0.249908, 0.351577, 0.398515];
    const text = describeStep(fwd.weights, bwd.loss, after, bwd);
    expect(text).toContain('W_V moved the most');
    expect(text).toMatch(/squared error 0\.315/);
  });

  it('reports the token that gained and the token that lost attention', () => {
    const before = [0.3, 0.32, 0.38];
    const after = [0.25, 0.35, 0.4];
    const text = describeStep(before, 0.1, after, {
      dWQ: [[0, 0, 0]],
      dWK: [[0, 0, 0]],
      dWV: [[1, 1, 1]],
    });
    expect(text).toContain('"cat" gained the most');
    expect(text).toContain('"the" lost the most');
  });
});
