/** Every symbol learned so far, in the order it was learned — newest one glows briefly. */

import { createPieceChip } from './pieceChip';

export interface VocabList {
  el: HTMLElement;
  render(vocabInOrder: string[], newestCount: number): void;
}

export function createVocabList(): VocabList {
  const el = document.createElement('div');
  el.className = 'vocab-list';

  function render(vocabInOrder: string[], newestCount: number): void {
    el.replaceChildren(
      ...vocabInOrder.map((sym, i) => {
        const chip = createPieceChip(sym);
        if (i >= vocabInOrder.length - newestCount) chip.classList.add('is-new');
        return chip;
      }),
    );
  }

  return { el, render };
}
