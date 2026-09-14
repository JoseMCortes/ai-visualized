import { describe, expect, it } from 'vitest';
import { buildDataset } from './dataset';
import { LearningToRank, predictTree, toRankExamples } from './ltr';

const ds = buildDataset();
const examples = toRankExamples(ds.pairList);

describe('LearningToRank', () => {
  it('every document starts at score 0', () => {
    const m = new LearningToRank(examples);
    for (const e of examples) expect(m.score(e.queryId, e.docId)).toBe(0);
  });

  it('pairwise loss decreases over boosting rounds', () => {
    const m = new LearningToRank(examples);
    const first = m.step().pairwiseLoss;
    let last = first;
    for (let i = 0; i < 9; i++) last = m.step().pairwiseLoss;
    expect(last).toBeLessThan(first);
  });

  it('after boosting, relevant documents outscore irrelevant ones on their own query', () => {
    const m = new LearningToRank(examples);
    for (let i = 0; i < 10; i++) m.step();
    for (const q of ds.queries) {
      const group = examples.filter((e) => e.queryId === q.id);
      const best = group.reduce((a, b) =>
        m.score(q.id, a.docId) > m.score(q.id, b.docId) ? a : b,
      );
      const bestRelevance = best.relevance;
      const maxRelevance = Math.max(...group.map((e) => e.relevance));
      expect(bestRelevance).toBe(maxRelevance);
    }
  });

  it('each round adds exactly one tree, and predictTree matches the ensemble contribution', () => {
    const m = new LearningToRank(examples, 0.5);
    const r1 = m.step();
    expect(m.trees).toHaveLength(1);
    const e = examples[0]!;
    const expected = m.learningRate * predictTree(r1.tree, e.x);
    expect(m.score(e.queryId, e.docId)).toBeCloseTo(expected);
  });

  it('reset clears the trees and scores', () => {
    const m = new LearningToRank(examples);
    m.step();
    m.step();
    m.reset();
    expect(m.trees).toHaveLength(0);
    expect(m.score(examples[0]!.queryId, examples[0]!.docId)).toBe(0);
  });

  it('feature importance accumulates and is non-negative', () => {
    const m = new LearningToRank(examples);
    let round;
    for (let i = 0; i < 5; i++) round = m.step();
    expect(round!.importance.every((v) => v >= 0)).toBe(true);
    expect(round!.importance.some((v) => v > 0)).toBe(true);
  });
});
