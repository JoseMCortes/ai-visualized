import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { candidateIds, mulberry32, sampleFromLogits } from './sampling';
import { buildModel } from './loadModel';
import type { ModelConfig, Vocab } from './types';

describe('candidateIds', () => {
  const probs = [0.5, 0.25, 0.15, 0.07, 0.03];

  it('keeps everything when both filters are off', () => {
    expect(candidateIds(probs, 0, 1)).toEqual([0, 1, 2, 3, 4]);
  });

  it('top-k keeps the k most likely, in order', () => {
    expect(candidateIds(probs, 2, 1)).toEqual([0, 1]);
  });

  it('top-p keeps the smallest prefix reaching the mass', () => {
    // 0.5, then 0.75 >= 0.7 -> stop
    expect(candidateIds(probs, 0, 0.7)).toEqual([0, 1]);
  });

  it('applies top-k before top-p', () => {
    expect(candidateIds(probs, 3, 0.99)).toEqual([0, 1, 2]);
  });
});

describe('mulberry32', () => {
  it('is deterministic for a seed and varies across seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual([c(), c(), c()]);
    for (const v of seqA) (expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThan(1));
  });
});

describe('sampleFromLogits', () => {
  it('temperature 0 is greedy', () => {
    const { id } = sampleFromLogits([1, 9, 2, 3], { temperature: 0 }, mulberry32(1));
    expect(id).toBe(1);
  });

  it('never returns a token outside the top-k set', () => {
    const logits = Array.from({ length: 20 }, (_, i) => i);
    const rng = mulberry32(7);
    for (let n = 0; n < 50; n++) {
      const { id } = sampleFromLogits(logits, { temperature: 1, topK: 3 }, rng);
      expect(id).toBeGreaterThanOrEqual(17);
    }
  });
});

describe('GPTModel.generate', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = join(here, '..', '..', 'public', 'model');
  const config = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')) as ModelConfig;
  const vocab = JSON.parse(readFileSync(join(dir, 'vocab.json'), 'utf8')) as Vocab;
  const buf = readFileSync(join(dir, 'model.bin'));
  const model = buildModel(
    config,
    vocab,
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );

  it('is reproducible for a fixed seed and produces in-vocab characters', () => {
    const run = () => {
      let out = '';
      for (const step of model.generate(model.encode('KING'), {
        maxNewTokens: 40,
        temperature: 0.8,
        topK: 20,
        seed: 123,
      })) {
        out += step.char;
      }
      return out;
    };
    const a = run();
    expect(a).toHaveLength(40);
    expect(run()).toBe(a);
    for (const ch of a) expect(vocab.stoi[ch]).toBeTypeOf('number');
  });

  it('temperature 0 generation is greedy and stable', () => {
    const greedy = [...model.generate(model.encode('ROMEO:'), { maxNewTokens: 12, temperature: 0 })]
      .map((s) => s.char)
      .join('');
    const again = [...model.generate(model.encode('ROMEO:'), { maxNewTokens: 12, temperature: 0 })]
      .map((s) => s.char)
      .join('');
    expect(greedy).toBe(again);
  });
});
