/**
 * A plain-language sentence for whatever just happened, so the score table's
 * numbers always have a narration next to them — not just the arithmetic.
 */

import type { TrainerState } from './wordpiece';

export function describeStep(
  trainer: TrainerState,
  finished: boolean,
  justAdvanced: number,
): string {
  if (trainer.merges.length === 0) {
    return "Training hasn't started yet — press Step to merge the single highest-scoring pair, or Play to keep going automatically.";
  }

  const { winner } = trainer.merges.at(-1)!;
  const batchPrefix =
    justAdvanced > 1 ? `Ran ${justAdvanced} merges back to back. Most recently, it ` : 'It ';
  const finishedSuffix = finished
    ? ' No pairs are left to merge — every word in the corpus is now a single token.'
    : '';

  return (
    `${batchPrefix}merged "${winner.left}" + "${winner.right}" into "${winner.merged}": ` +
    `those two pieces sat next to each other ${plural(winner.pairFreq, 'time')}, while ` +
    `"${winner.left}" appears ${plural(winner.leftFreq, 'time')} total and "${winner.right}" ` +
    `appears ${plural(winner.rightFreq, 'time')} total — giving it the highest score of any ` +
    `pair this round (${winner.score.toFixed(4)}).${finishedSuffix}`
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
