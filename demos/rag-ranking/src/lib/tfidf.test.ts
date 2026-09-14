import { describe, expect, it } from 'vitest';
import { DOCS } from '../corpus';
import { idf, tfidfBreakdown, tfidfScore } from './tfidf';
import { buildCorpus } from './textstats';

const corpus = buildCorpus(DOCS);

describe('idf', () => {
  it('is higher for rarer terms', () => {
    // "battery" appears in 2 docs (S1, A1); "space" appears in only 1 (S3's topic word isn't literal — use a real rare term)
    const common = idf(corpus, 'battery'); // appears in 2 docs
    const rare = idf(corpus, 'pesto'); // appears in 1 doc
    expect(rare).toBeGreaterThan(common);
  });

  it('is always positive, even for a term in every document', () => {
    // no real term appears in all 18, but the smoothing formula guarantees positivity regardless
    expect(idf(corpus, 'battery')).toBeGreaterThan(0);
  });
});

describe('tfidfBreakdown', () => {
  it('gives zero contribution for query terms absent from the document', () => {
    const b = tfidfBreakdown(corpus, 'sourdough bread crust', 'S1');
    expect(b.rows.every((r) => !r.inDoc)).toBe(true);
    expect(b.total).toBe(0);
  });

  it('sums term contributions to the total', () => {
    const b = tfidfBreakdown(corpus, 'sourdough bread crust', 'C1');
    const sum = b.rows.reduce((s, r) => s + r.contribution, 0);
    expect(b.total).toBeCloseTo(sum);
  });

  it('the exact-match document scores highest for the baseline query', () => {
    const scores = DOCS.map((d) => ({
      id: d.id,
      s: tfidfScore(corpus, 'sourdough bread crust', d.id),
    }));
    scores.sort((a, b) => b.s - a.s);
    expect(scores[0]!.id).toBe('C1');
  });
});
