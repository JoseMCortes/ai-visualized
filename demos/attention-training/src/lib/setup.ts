/**
 * The exact toy example this demo trains on: "the cat sat", read as
 * [function-word, thing-ness, action-ness]. "sat" (the last token) is the
 * query — a useful thing for a verb to learn is who did it, so training
 * pushes its output toward cat's embedding.
 */

import type { Mat, Vec } from './matrix';

export const TOKENS = ['the', 'cat', 'sat'];

export const EMBEDDINGS: Mat = [
  [1.0, 0.0, 0.0], // the — a function word
  [0.0, 1.0, 0.5], // cat — mostly a thing, a bit lively
  [0.0, 0.5, 1.0], // sat — mostly an action
];

export const QUERY_INDEX = 2; // "sat"

/** What "sat" should end up carrying: the subject's embedding. */
export const TARGET: Vec = [0.0, 1.0, 0.5];

export const INITIAL_WQ: Mat = [
  [0.5, 0, 0],
  [0, 0.5, 0.5],
  [0.5, 0, 1],
];

export const INITIAL_WK: Mat = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0.5, 0.5],
];

export const INITIAL_WV: Mat = [
  [0.5, 0, 0],
  [0, 1, 0],
  [0, 0, 0.5],
];

export const LEARNING_RATE = 0.5;
