/**
 * The statistics every lexical ranking method is built from: how many times
 * a term appears in a document (term frequency), and in how many documents a
 * term appears at all (document frequency). TF-IDF and BM25 differ only in
 * how they turn these numbers into a score.
 */

import type { Doc } from '../corpus';
import { tokenize } from './tokenize';

export interface Corpus {
  docs: Doc[];
  /** tokens per document, in id order */
  tokens: string[][];
  /** term -> count, per document (docId -> term -> count) */
  tf: Map<string, Map<string, number>>;
  /** term -> number of documents containing it at least once */
  df: Map<string, number>;
  /** token count per document, docId -> length */
  length: Map<string, number>;
  avgLength: number;
  n: number;
}

export function buildCorpus(docs: Doc[]): Corpus {
  const tokensByDoc = docs.map((d) => tokenize(d.text));
  const tf = new Map<string, Map<string, number>>();
  const df = new Map<string, number>();
  const length = new Map<string, number>();

  docs.forEach((d, i) => {
    const toks = tokensByDoc[i]!;
    length.set(d.id, toks.length);
    const counts = new Map<string, number>();
    for (const t of toks) counts.set(t, (counts.get(t) ?? 0) + 1);
    tf.set(d.id, counts);
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  });

  const avgLength = docs.reduce((s, d) => s + length.get(d.id)!, 0) / docs.length;

  return { docs, tokens: tokensByDoc, tf, df, length, avgLength, n: docs.length };
}

export function termFreq(corpus: Corpus, docId: string, term: string): number {
  return corpus.tf.get(docId)?.get(term) ?? 0;
}

export function docFreq(corpus: Corpus, term: string): number {
  return corpus.df.get(term) ?? 0;
}
