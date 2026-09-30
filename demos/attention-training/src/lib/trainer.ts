/**
 * Repeats forward → loss → backward → update on the fixed "the cat sat"
 * example, tracking loss and attention weights across steps so the charts
 * can show the whole training run, not just the current instant.
 */

import { backward, forward, type ForwardResult } from './model';
import {
  EMBEDDINGS,
  INITIAL_WK,
  INITIAL_WQ,
  INITIAL_WV,
  LEARNING_RATE,
  QUERY_INDEX,
  TARGET,
} from './setup';
import type { Mat } from './matrix';

export interface StepRecord {
  step: number;
  weights: number[]; // attention weight per token, after this step's update
  loss: number; // loss computed *before* this step's update (what the update was reacting to)
}

export interface TrainerState {
  WQ: Mat;
  WK: Mat;
  WV: Mat;
  history: StepRecord[];
  lastForward: ForwardResult;
}

function runForward(WQ: Mat, WK: Mat, WV: Mat): ForwardResult {
  return forward(EMBEDDINGS, QUERY_INDEX, WQ, WK, WV);
}

export function initTrainer(): TrainerState {
  return {
    WQ: INITIAL_WQ,
    WK: INITIAL_WK,
    WV: INITIAL_WV,
    history: [],
    lastForward: runForward(INITIAL_WQ, INITIAL_WK, INITIAL_WV),
  };
}

export interface StepResult {
  fwd: ForwardResult;
  loss: number;
  dWQ: Mat;
  dWK: Mat;
  dWV: Mat;
}

function applyGrad(W: Mat, dW: Mat, lr: number): Mat {
  return W.map((row, i) => row.map((v, j) => v - lr * dW[i]![j]!));
}

/** One full training step: forward, loss, backward, update. Mutates and returns the trainer state. */
export function trainStep(state: TrainerState): StepResult {
  const fwd = forward(EMBEDDINGS, QUERY_INDEX, state.WQ, state.WK, state.WV);
  const { loss, dWQ, dWK, dWV } = backward(EMBEDDINGS, QUERY_INDEX, fwd, TARGET);

  state.WQ = applyGrad(state.WQ, dWQ, LEARNING_RATE);
  state.WK = applyGrad(state.WK, dWK, LEARNING_RATE);
  state.WV = applyGrad(state.WV, dWV, LEARNING_RATE);
  state.lastForward = runForward(state.WQ, state.WK, state.WV);

  state.history.push({ step: state.history.length + 1, weights: state.lastForward.weights, loss });

  return { fwd, loss, dWQ, dWK, dWV };
}
