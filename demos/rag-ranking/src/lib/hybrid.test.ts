import { describe, expect, it } from 'vitest';
import { hybridScores } from './hybrid';

const rows = [
  { docId: 'a', bm25: 10, cosine: 0.1 },
  { docId: 'b', bm25: 0, cosine: 0.9 },
  { docId: 'c', bm25: 5, cosine: 0.5 },
];

describe('hybridScores', () => {
  it('normalises each score to 0..1 within the set', () => {
    const out = hybridScores(rows, 0.5);
    expect(Math.max(...out.map((r) => r.bm25Norm))).toBeCloseTo(1);
    expect(Math.min(...out.map((r) => r.bm25Norm))).toBeCloseTo(0);
    expect(Math.max(...out.map((r) => r.cosineNorm))).toBeCloseTo(1);
    expect(Math.min(...out.map((r) => r.cosineNorm))).toBeCloseTo(0);
  });

  it('alpha=1 reduces to pure (normalised) BM25 order', () => {
    const out = hybridScores(rows, 1);
    const order = [...out].sort((x, y) => y.hybrid - x.hybrid).map((r) => r.docId);
    expect(order).toEqual(['a', 'c', 'b']);
  });

  it('alpha=0 reduces to pure (normalised) cosine order', () => {
    const out = hybridScores(rows, 0);
    const order = [...out].sort((x, y) => y.hybrid - x.hybrid).map((r) => r.docId);
    expect(order).toEqual(['b', 'c', 'a']);
  });

  it('a constant score column normalises to 0 everywhere, not NaN', () => {
    const flat = [
      { docId: 'x', bm25: 3, cosine: 0.5 },
      { docId: 'y', bm25: 3, cosine: 0.5 },
    ];
    const out = hybridScores(flat, 0.5);
    expect(out.every((r) => Number.isFinite(r.hybrid))).toBe(true);
  });
});
