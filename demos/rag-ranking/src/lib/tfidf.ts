/**
 * TF-IDF: score a document against a query by how often each query word
 * appears in it (term frequency), weighted so that words appearing in
 * *fewer* documents overall count for more (inverse document frequency) —
 * a word every document shares tells you nothing about which one to pick.
 *
 *   idf(t)      = log( (N + 1) / (df(t) + 1) ) + 1      always positive
 *   score(d, q) = Σ over query terms t of  tf(t, d) × idf(t)
 */

import { tokenize } from './tokenize';
import { docFreq, termFreq, type Corpus } from './textstats';

export function idf(corpus: Corpus, term: string): number {
  const df = docFreq(corpus, term);
  return Math.log((corpus.n + 1) / (df + 1)) + 1;
}

export interface TermRow {
  term: string;
  tf: number;
  idf: number;
  contribution: number;
  inDoc: boolean;
}

export interface TfIdfBreakdown {
  docId: string;
  rows: TermRow[];
  total: number;
}

export function tfidfBreakdown(corpus: Corpus, query: string, docId: string): TfIdfBreakdown {
  const qTerms = [...new Set(tokenize(query))];
  const rows: TermRow[] = qTerms.map((term) => {
    const tf = termFreq(corpus, docId, term);
    const w = idf(corpus, term);
    return { term, tf, idf: w, contribution: tf * w, inDoc: tf > 0 };
  });
  return { docId, rows, total: rows.reduce((s, r) => s + r.contribution, 0) };
}

export function tfidfScore(corpus: Corpus, query: string, docId: string): number {
  return tfidfBreakdown(corpus, query, docId).total;
}
