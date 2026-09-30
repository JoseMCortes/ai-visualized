import { describe, expect, it } from 'vitest';
import { describeStep } from './describeStep';
import { initTrainer, trainStep } from './wordpiece';

describe('describeStep', () => {
  it('says training has not started when there are no merges yet', () => {
    const trainer = initTrainer([{ word: 'ab', count: 1 }]);
    expect(describeStep(trainer, false, 0)).toMatch(/hasn't started/);
  });

  it('narrates the single merge that just happened', () => {
    const trainer = initTrainer([{ word: 'ab', count: 3 }]);
    trainStep(trainer);
    const text = describeStep(trainer, false, 1);
    expect(text).toContain('"a" + "##b" into "ab"');
    expect(text).toContain('3 times');
    expect(text).not.toMatch(/^Ran \d+ merges/);
  });

  it('mentions the batch size when several steps ran at once', () => {
    const trainer = initTrainer([
      { word: 'aa', count: 3 },
      { word: 'ab', count: 1 },
    ]);
    trainStep(trainer);
    trainStep(trainer);
    const text = describeStep(trainer, false, 2);
    expect(text).toMatch(/^Ran 2 merges back to back\./);
  });

  it('appends a completion note once training is finished', () => {
    const trainer = initTrainer([{ word: 'ab', count: 1 }]);
    trainStep(trainer);
    const text = describeStep(trainer, true, 1);
    expect(text).toMatch(/No pairs are left to merge/);
  });

  it('uses singular "time" for a pair that only co-occurred once', () => {
    const trainer = initTrainer([{ word: 'ab', count: 1 }]);
    trainStep(trainer);
    const text = describeStep(trainer, false, 1);
    expect(text).toContain('1 time,');
    expect(text).not.toContain('1 times');
  });
});
