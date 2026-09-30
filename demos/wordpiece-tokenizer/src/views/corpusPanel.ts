/** The fixed training corpus — word + how often it appears, for context. */

import type { WordEntry } from '../lib/wordpiece';

export function createCorpusPanel(host: HTMLElement, corpus: WordEntry[]): void {
  host.classList.add('corpus-panel');
  const sorted = [...corpus].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  host.replaceChildren(
    ...sorted.map((entry) => {
      const chip = document.createElement('span');
      chip.className = 'cw-chip';
      const word = document.createElement('span');
      word.textContent = entry.word;
      const count = document.createElement('span');
      count.className = 'cw-count';
      count.textContent = String(entry.count);
      chip.append(word, count);
      return chip;
    }),
  );
}
