import { describe, expect, it } from 'vitest';
import { initTrainer, trainStep } from './trainer';

describe('trainStep', () => {
  it('matches PyTorch step 0: loss ~0.315 before the update, weights biased toward "sat" itself', () => {
    const state = initTrainer();
    const result = trainStep(state);
    expect(result.loss).toBeCloseTo(0.315294, 5);
    expect(state.lastForward.weights[2]).toBeGreaterThan(state.lastForward.weights[0]!);
  });

  it('matches PyTorch step 1 after one update: loss collapses and "cat" pulls ahead', () => {
    const state = initTrainer();
    trainStep(state); // uses the pre-update loss, matching PyTorch's step-0 print
    const second = trainStep(state);
    expect(second.loss).toBeCloseTo(0.019465, 5);
    // after this step's update, weights should now favor "cat" over "the"
    expect(state.lastForward.weights[1]).toBeGreaterThan(state.lastForward.weights[0]!);
  });

  it('records one history entry per step, in order', () => {
    const state = initTrainer();
    trainStep(state);
    trainStep(state);
    trainStep(state);
    expect(state.history).toHaveLength(3);
    expect(state.history.map((h) => h.step)).toEqual([1, 2, 3]);
  });

  it('keeps driving the loss down over many steps', () => {
    const state = initTrainer();
    let last = Infinity;
    for (let i = 0; i < 15; i++) {
      const { loss } = trainStep(state);
      expect(loss).toBeLessThanOrEqual(last + 1e-9);
      last = loss;
    }
    expect(last).toBeLessThan(0.001);
  });

  it('shifts attention away from "the" and toward "cat" — verified against PyTorch\'s own 5-step run', () => {
    // PyTorch, this exact example, step 4: weights ~= [0.2335, 0.3604, 0.4061].
    // Most of the fix comes from W_V (it's the largest gradient — see the docs above),
    // not from attention fully isolating "cat"; "sat" keeps the largest single weight
    // even after convergence. That's a real property of this toy example, not a bug.
    const state = initTrainer();
    const [the0, cat0] = state.lastForward.weights;
    for (let i = 0; i < 5; i++) trainStep(state);
    const [the5, cat5] = state.lastForward.weights;
    expect(the5).toBeLessThan(the0!);
    expect(cat5).toBeGreaterThan(cat0!);
    expect(the5).toBeCloseTo(0.2335, 3);
    expect(cat5).toBeCloseTo(0.3604, 3);
  });

  it('starts fresh from the documented initial matrices', () => {
    const a = initTrainer();
    const b = initTrainer();
    expect(a.WQ).toEqual(b.WQ);
    expect(a.lastForward.weights).toEqual(b.lastForward.weights);
  });
});
