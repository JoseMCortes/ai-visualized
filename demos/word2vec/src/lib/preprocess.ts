/**
 * Turn a big blob of text into something skip-gram can train on:
 *
 *   1. split into sentences, then into lowercase word tokens
 *   2. drop stop-words (function words carry no topical signal)
 *   3. keep only the `vocabSize` most frequent remaining words that occur at
 *      least `minCount` times — those are the "relevant words" the demo tracks
 *   4. thin out very frequent words (word2vec-style subsampling) so a handful
 *      of common nouns don't dominate every window
 *   5. re-emit each sentence as a list of kept-word ids
 */

import { mulberry32 } from './trainer';
import { STOPWORDS } from './stopwords';

export interface Prepared {
  vocab: string[];
  counts: number[]; // corpus count of each kept word
  sentences: number[][]; // kept-word ids, per sentence
  keptSentences: number;
  totalTokens: number; // tokens after stop-word removal
}

export interface PrepareOptions {
  vocabSize: number;
  minCount: number;
  /** subsampling strength t; smaller = thin frequent words harder. 0 disables. */
  subsample: number;
  seed: number;
}

export function tokenize(sentence: string): string[] {
  return sentence.toLowerCase().match(/[a-z]+/g) ?? [];
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;:])\s+|(?:\s*\n\s*){1,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function prepare(text: string, opts: PrepareOptions): Prepared {
  const rawSentences = splitSentences(text).map(tokenize);

  // 1-2. global counts over non-stop-word tokens
  const count = new Map<string, number>();
  let totalTokens = 0;
  for (const toks of rawSentences) {
    for (const w of toks) {
      if (w.length < 3 || STOPWORDS.has(w)) continue;
      count.set(w, (count.get(w) ?? 0) + 1);
      totalTokens++;
    }
  }

  // 3. vocabulary = the most frequent words clearing minCount
  const vocab = [...count.entries()]
    .filter(([, c]) => c >= opts.minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.vocabSize)
    .map(([w]) => w);
  const id = new Map(vocab.map((w, i) => [w, i]));
  const counts = vocab.map((w) => count.get(w)!);

  // 4. keep-probability for subsampling (Mikolov et al.): p_keep = sqrt(t / f)
  const rng = mulberry32(opts.seed);
  const keepProb = counts.map((c) => {
    if (opts.subsample <= 0) return 1;
    const f = c / totalTokens;
    return Math.min(1, Math.sqrt(opts.subsample / f));
  });

  // 5. re-emit sentences as id lists
  const sentences: number[][] = [];
  for (const toks of rawSentences) {
    const ids: number[] = [];
    for (const w of toks) {
      const wi = id.get(w);
      if (wi === undefined) continue;
      if (rng() <= keepProb[wi]!) ids.push(wi);
    }
    if (ids.length >= 2) sentences.push(ids);
  }

  return { vocab, counts, sentences, keptSentences: sentences.length, totalTokens };
}
