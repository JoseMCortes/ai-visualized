/**
 * Runs a brand-new sentence through the *current* trained matrices — the
 * exact same `forward()` function training itself calls, with the last
 * word as the query (consistent with what was actually trained: "a verb
 * looks at its subject"). This is real inference, not a demo of it.
 */

import { forward, type ForwardResult } from './model';
import { lookupSentence, type LookupResult } from './vocab';
import type { Mat } from './matrix';

export interface InferenceResult {
  tokens: LookupResult[];
  queryIndex: number;
  fwd: ForwardResult;
}

export function runSentence(sentence: string, WQ: Mat, WK: Mat, WV: Mat): InferenceResult | null {
  const tokens = lookupSentence(sentence);
  if (tokens.length === 0) return null;
  const embeddings = tokens.map((t) => t.embedding);
  const queryIndex = tokens.length - 1;
  const fwd = forward(embeddings, queryIndex, WQ, WK, WV);
  return { tokens, queryIndex, fwd };
}
