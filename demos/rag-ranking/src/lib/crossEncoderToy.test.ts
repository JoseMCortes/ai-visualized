import { describe, expect, it } from 'vitest';
import { buildDataset } from './dataset';
import { CrossEncoderToy, toExamples } from './crossEncoderToy';

const ds = buildDataset();
const examples = toExamples(ds.pairList);

describe('CrossEncoderToy', () => {
  it('starts at zero weights and zero bias', () => {
    const m = new CrossEncoderToy(examples);
    expect(m.weights.every((w) => w === 0)).toBe(true);
    expect(m.bias).toBe(0);
  });

  it('loss decreases as training proceeds', () => {
    const m = new CrossEncoderToy(examples);
    const first = m.step().loss;
    for (let i = 0; i < 40; i++) m.step();
    const later = m.step().loss;
    expect(later).toBeLessThan(first);
  });

  it('learns to score the labelled-relevant examples above the irrelevant ones', () => {
    const m = new CrossEncoderToy(examples);
    for (let i = 0; i < 150; i++) m.step();
    const relevant = examples.filter((e) => e.target > 0.5).map((e) => m.predict(e.features));
    const irrelevant = examples.filter((e) => e.target === 0).map((e) => m.predict(e.features));
    const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(relevant)).toBeGreaterThan(avg(irrelevant));
  });

  it('reset returns weights and epoch to the start', () => {
    const m = new CrossEncoderToy(examples);
    m.step();
    m.step();
    m.reset();
    expect(m.epoch).toBe(0);
    expect(m.weights.every((w) => w === 0)).toBe(true);
  });
});
