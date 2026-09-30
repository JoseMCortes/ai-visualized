/** Type a sentence; it's tokenized against the fixed vocabulary and run through the current matrices. */

import type { InferenceResult } from '../lib/inference';
import { createAttentionBars } from './attentionBars';

export interface Playground {
  el: HTMLElement;
  render(result: InferenceResult | null): void;
}

export function createPlayground(onInput: (text: string) => void, initial: string): Playground {
  const el = document.createElement('div');
  el.className = 'playground';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'pg-input';
  input.spellcheck = false;
  input.value = initial;
  input.addEventListener('input', () => onInput(input.value));

  const tokenRow = document.createElement('div');
  tokenRow.className = 'pg-tokens';
  const barsHost = document.createElement('div');
  const outputRow = document.createElement('div');
  outputRow.className = 'pg-output';

  el.append(input, tokenRow, barsHost, outputRow);
  const bars = createAttentionBars(barsHost);

  function render(result: InferenceResult | null): void {
    if (!result) {
      tokenRow.innerHTML = `<p class="pg-empty">Type a sentence above.</p>`;
      barsHost.replaceChildren();
      outputRow.textContent = '';
      return;
    }

    tokenRow.replaceChildren(
      ...result.tokens.map((t, i) => {
        const chip = document.createElement('span');
        chip.className =
          'pg-chip' +
          (!t.known ? ' is-unknown' : '') +
          (i === result.queryIndex ? ' is-query' : '');
        chip.textContent = t.known ? t.word : `${t.word} (unknown — neutral embedding)`;
        return chip;
      }),
    );

    bars.render(
      result.tokens.map((t) => t.word),
      result.fwd.weights,
      result.queryIndex,
    );

    const out = result.fwd.output.map((v) => v.toFixed(2)).join(', ');
    outputRow.textContent = `Output for "${result.tokens[result.queryIndex]!.word}": [${out}]`;
  }

  return { el, render };
}
