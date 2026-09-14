import { describe, expect, it } from 'vitest';
import { DOCS } from '../corpus';
import { bm25Breakdown, bm25Score } from './bm25';
import { buildCorpus } from './textstats';

const corpus = buildCorpus(DOCS);

describe('bm25Breakdown', () => {
  it('the exact-match document scores highest for the baseline query', () => {
    const scores = DOCS.map((d) => ({
      id: d.id,
      s: bm25Score(corpus, 'sourdough bread crust', d.id),
    }));
    scores.sort((a, b) => b.s - a.s);
    expect(scores[0]!.id).toBe('C1');
  });

  it('term-frequency saturation makes a second occurrence worth less than the first', () => {
    // synthetic corpus: one doc repeats "battery" many times, the other has it once
    const docs = [
      { id: 'once', topic: 't', title: '', text: 'battery power system' },
      { id: 'many', topic: 't', title: '', text: 'battery battery battery battery power' },
    ];
    const c = buildCorpus(docs);
    const once = bm25Breakdown(c, 'battery', 'once').rows[0]!;
    const many = bm25Breakdown(c, 'battery', 'many').rows[0]!;
    // 4x the raw count should NOT give 4x the saturated contribution
    expect(many.contribution).toBeLessThan(once.contribution * 4);
    expect(many.contribution).toBeGreaterThan(once.contribution); // still worth more, just not proportionally
  });

  it('a shorter document is not penalised relative to a longer one that repeats the term the same number of times', () => {
    const docs = [
      { id: 'short', topic: 't', title: '', text: 'battery power' },
      {
        id: 'long',
        topic: 't',
        title: '',
        text: 'battery power and many other unrelated extra padding words here too',
      },
    ];
    const c = buildCorpus(docs);
    const short = bm25Score(c, 'battery power', 'short');
    const long = bm25Score(c, 'battery power', 'long');
    expect(short).toBeGreaterThan(long);
  });

  it('reports the document length and corpus average used for normalisation', () => {
    const b = bm25Breakdown(corpus, 'battery', 'A1');
    expect(b.docLength).toBeGreaterThan(0);
    expect(b.avgLength).toBeCloseTo(corpus.avgLength);
  });
});
