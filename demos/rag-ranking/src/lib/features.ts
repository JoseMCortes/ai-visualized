/**
 * The shared feature set both trained methods (the toy cross-encoder and
 * learning-to-rank) learn from. Each feature looks at the query and the
 * document *together* — that's what makes them "cross" features, as opposed
 * to TF-IDF/BM25 (lexical only) or cosine similarity (each encoded alone,
 * then compared).
 */

import { bigrams, tokenize } from './tokenize';

export const FEATURE_NAMES = ['termOverlap', 'phraseMatch', 'bm25Norm', 'cosineNorm'] as const;
export type FeatureName = (typeof FEATURE_NAMES)[number];
export type FeatureVector = Record<FeatureName, number>;

export const FEATURE_LABELS: Record<FeatureName, string> = {
  termOverlap: 'share of query words found in the document',
  phraseMatch: 'query word pairs that appear adjacent in the document too',
  bm25Norm: "BM25's lexical score (normalised 0-1)",
  cosineNorm: "the embeddings' cosine similarity (rescaled 0-1)",
};

/** Fraction of the query's distinct words that appear anywhere in the document. */
export function termOverlap(query: string, docText: string): number {
  const qTerms = [...new Set(tokenize(query))];
  if (qTerms.length === 0) return 0;
  const docTerms = new Set(tokenize(docText));
  const hits = qTerms.filter((t) => docTerms.has(t)).length;
  return hits / qTerms.length;
}

/** Fraction of the query's adjacent word pairs that also appear adjacent in the document. */
export function phraseMatch(query: string, docText: string): number {
  const qBigrams = bigrams(tokenize(query));
  if (qBigrams.length === 0) return 0;
  const docBigrams = new Set(bigrams(tokenize(docText)));
  const hits = qBigrams.filter((b) => docBigrams.has(b)).length;
  return hits / qBigrams.length;
}

export function buildFeatures(
  query: string,
  docText: string,
  bm25Norm: number,
  cosineNorm: number,
): FeatureVector {
  return {
    termOverlap: termOverlap(query, docText),
    phraseMatch: phraseMatch(query, docText),
    bm25Norm,
    cosineNorm,
  };
}

export function featureArray(f: FeatureVector): number[] {
  return FEATURE_NAMES.map((n) => f[n]);
}
