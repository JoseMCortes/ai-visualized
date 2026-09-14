/**
 * BM25 — the standard lexical ranker, and a direct refinement of TF-IDF with
 * two fixes:
 *
 *  1. Term-frequency saturation: TF-IDF treats a word appearing 10 times as
 *     10x as important as appearing once. BM25 lets extra repeats matter
 *     less and less (a curve that flattens out), which matches how relevance
 *     actually works — the 10th mention rarely adds as much as the 2nd did.
 *  2. Length normalisation: a long document naturally contains more words,
 *     so BM25 discounts documents that are longer than average.
 *
 *   idf(t) = log( (N - df(t) + 0.5) / (df(t) + 0.5) + 1 )     always positive
 *
 *   score(d, q) = Σ over query terms t of
 *       idf(t) × tf(t,d) × (k1 + 1)
 *              ─────────────────────────────────────────
 *              tf(t,d) + k1 × (1 − b + b × |d| / avgdl)
 */

import { docFreq, termFreq, type Corpus } from './textstats';
import { tokenize } from './tokenize';

export const K1 = 1.5;
export const B = 0.75;

export function bm25Idf(corpus: Corpus, term: string): number {
  const df = docFreq(corpus, term);
  return Math.log((corpus.n - df + 0.5) / (df + 0.5) + 1);
}

export interface Bm25TermRow {
  term: string;
  tf: number;
  idf: number;
  /** the saturated, length-normalised term score (before multiplying by idf) */
  saturatedTf: number;
  contribution: number;
  inDoc: boolean;
}

export interface Bm25Breakdown {
  docId: string;
  docLength: number;
  avgLength: number;
  rows: Bm25TermRow[];
  total: number;
}

export function bm25Breakdown(corpus: Corpus, query: string, docId: string): Bm25Breakdown {
  const qTerms = [...new Set(tokenize(query))];
  const docLength = corpus.length.get(docId) ?? 0;
  const lengthNorm = 1 - B + B * (docLength / corpus.avgLength);

  const rows: Bm25TermRow[] = qTerms.map((term) => {
    const tf = termFreq(corpus, docId, term);
    const w = bm25Idf(corpus, term);
    const saturatedTf = (tf * (K1 + 1)) / (tf + K1 * lengthNorm);
    return { term, tf, idf: w, saturatedTf, contribution: w * saturatedTf, inDoc: tf > 0 };
  });

  return {
    docId,
    docLength,
    avgLength: corpus.avgLength,
    rows,
    total: rows.reduce((s, r) => s + r.contribution, 0),
  };
}

export function bm25Score(corpus: Corpus, query: string, docId: string): number {
  return bm25Breakdown(corpus, query, docId).total;
}
