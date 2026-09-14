import { describe, expect, it } from 'vitest';
import { DOCS } from '../corpus';
import { cosineBreakdown, MiniEmbeddings, trainOnCorpus } from './miniEmbeddings';

describe('MiniEmbeddings', () => {
  it('trains a vector for every distinct word seen', () => {
    const emb = new MiniEmbeddings(
      [
        ['dog', 'runs'],
        ['cat', 'runs'],
      ],
      200,
      1,
    );
    expect(emb.vocab.sort()).toEqual(['cat', 'dog', 'runs']);
    expect(emb.vectorOf('dog')).toHaveLength(8);
  });

  it('is deterministic for a given seed', () => {
    const a = new MiniEmbeddings(
      [
        ['dog', 'runs'],
        ['cat', 'runs'],
      ],
      500,
      3,
    );
    const b = new MiniEmbeddings(
      [
        ['dog', 'runs'],
        ['cat', 'runs'],
      ],
      500,
      3,
    );
    expect(a.vectorOf('dog')).toEqual(b.vectorOf('dog'));
  });

  it('bagVector averages known words and ignores unknown ones', () => {
    const emb = new MiniEmbeddings([['dog', 'runs', 'fast']], 300, 2);
    const v = emb.bagVector('dog zzz');
    const dog = emb.vectorOf('dog');
    // "zzz" is unknown, so the bag vector should equal dog's vector alone
    v.forEach((x, i) => expect(x).toBeCloseTo(dog[i]!));
  });

  it('returns an all-zero vector for text with no known words', () => {
    const emb = new MiniEmbeddings([['dog', 'runs']], 100, 1);
    expect(emb.bagVector('zzz yyy')).toEqual(new Array(8).fill(0));
  });
});

describe('cosineBreakdown', () => {
  it('is 1 for identical vectors and 0 for orthogonal ones', () => {
    expect(cosineBreakdown([1, 0], [2, 0]).cosine).toBeCloseTo(1);
    expect(cosineBreakdown([1, 0], [0, 1]).cosine).toBeCloseTo(0);
  });

  it('per-dimension products sum to the dot product', () => {
    const b = cosineBreakdown([1, 2, 3], [4, 5, 6]);
    expect(b.perDim.reduce((s, x) => s + x, 0)).toBeCloseTo(b.dot);
    expect(b.dot).toBe(32);
  });
});

describe('trainOnCorpus, on the demo corpus', () => {
  it('places the exact-match document closest to the baseline query', () => {
    const emb = trainOnCorpus(DOCS);
    const qVec = emb.bagVector('sourdough bread crust');
    const scored = DOCS.map((d) => ({
      id: d.id,
      cos: cosineBreakdown(qVec, emb.bagVector(d.text)).cosine,
    })).sort((a, b) => b.cos - a.cos);
    expect(scored[0]!.id).toBe('C1');
  });

  it('ranks the zero-overlap paraphrase target above BM25 would', () => {
    // BM25 gives "resolving defects in the code" vs P1 a score of exactly 0
    // (no shared words); embeddings should do better than last place.
    const emb = trainOnCorpus(DOCS);
    const qVec = emb.bagVector('resolving defects in the code');
    const scored = DOCS.map((d) => ({
      id: d.id,
      cos: cosineBreakdown(qVec, emb.bagVector(d.text)).cosine,
    })).sort((a, b) => b.cos - a.cos);
    const rank = scored.findIndex((s) => s.id === 'P1') + 1;
    expect(rank).toBeLessThanOrEqual(6);
  });
});
