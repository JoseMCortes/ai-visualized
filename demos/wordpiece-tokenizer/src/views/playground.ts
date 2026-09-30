/** Type anything — tokenized live against whatever vocabulary training has produced so far. */

import type { TokenizedWord } from '../lib/tokenize';
import { createPieceRow, createUnkChip } from './pieceChip';

export interface Playground {
  el: HTMLElement;
  renderResult(words: TokenizedWord[]): void;
}

export function createPlayground(onInput: (text: string) => void, initial: string): Playground {
  const el = document.createElement('div');
  el.className = 'playground';

  const input = document.createElement('textarea');
  input.className = 'pg-input';
  input.rows = 2;
  input.spellcheck = false;
  input.value = initial;
  input.addEventListener('input', () => onInput(input.value));

  const result = document.createElement('div');
  result.className = 'pg-result';

  el.append(input, result);

  function renderResult(words: TokenizedWord[]): void {
    if (words.length === 0) {
      result.innerHTML = `<p class="pg-empty">Type something above.</p>`;
      return;
    }
    result.replaceChildren(
      ...words.map(({ tokens, isUnk }) => {
        const wordWrap = document.createElement('span');
        wordWrap.className = 'pg-word';
        wordWrap.appendChild(isUnk ? createUnkChip() : createPieceRow(tokens));
        return wordWrap;
      }),
    );
  }

  return { el, renderResult };
}
