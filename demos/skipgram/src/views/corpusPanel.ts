/**
 * The corpus, with the current sentence highlighted and the center word +
 * context word marked, so you can see where the training pair came from.
 */

import { tokenize } from '../corpus';

export interface CorpusPanel {
  render(loc: { sentenceIndex: number; centerPos: number; contextPos: number } | null): void;
}

export function createCorpusPanel(host: HTMLElement, sentences: string[]): CorpusPanel {
  host.classList.add('corpus');
  const tokens = sentences.map(tokenize);

  function render(
    loc: { sentenceIndex: number; centerPos: number; contextPos: number } | null,
  ): void {
    let activeLine: HTMLElement | null = null;
    host.replaceChildren(
      ...tokens.map((words, s) => {
        const line = document.createElement('div');
        const isActive = loc != null && s === loc.sentenceIndex;
        line.className = 'corpus-line' + (isActive ? ' is-active' : '');
        if (isActive) activeLine = line;
        words.forEach((w, i) => {
          const span = document.createElement('span');
          span.textContent = w;
          if (loc && s === loc.sentenceIndex) {
            if (i === loc.centerPos) span.className = 'tok is-center';
            else if (i === loc.contextPos) span.className = 'tok is-context';
            else span.className = 'tok';
          } else {
            span.className = 'tok';
          }
          line.appendChild(span);
          if (i < words.length - 1) line.appendChild(document.createTextNode(' '));
        });
        return line;
      }),
    );
    // Scroll only the corpus container (never the page).
    const line = activeLine as HTMLElement | null;
    if (line) {
      const want = line.offsetTop - host.clientHeight / 2 + line.clientHeight / 2;
      host.scrollTop = Math.max(0, want);
    }
  }

  return { render };
}
