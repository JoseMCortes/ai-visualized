/**
 * A handful of words to watch shrink as training proceeds. The in-corpus
 * group shows the *actual* split being merged — this is training itself,
 * not a re-tokenization of it. The held-out group was never in the
 * training data; each is run through whatever vocabulary exists so far,
 * exactly like the playground below does for anything you type.
 */

import { createPieceRow, createUnkChip } from './pieceChip';

export interface WatchWordsGroup {
  title: string;
  note: string;
}

export interface WatchWords {
  el: HTMLElement;
  render(entries: { word: string; tokens: string[] | null }[]): void;
}

export function createWatchWords(group: WatchWordsGroup): WatchWords {
  const el = document.createElement('div');
  el.className = 'watch-words';

  const title = document.createElement('div');
  title.className = 'ww-title';
  title.textContent = group.title;
  const note = document.createElement('p');
  note.className = 'ww-note';
  note.textContent = group.note;
  const rows = document.createElement('div');
  rows.className = 'ww-rows';

  el.append(title, note, rows);

  function render(entries: { word: string; tokens: string[] | null }[]): void {
    rows.replaceChildren(
      ...entries.map(({ word, tokens }) => {
        const row = document.createElement('div');
        row.className = 'ww-row';
        const label = document.createElement('span');
        label.className = 'ww-word';
        label.textContent = word;
        row.appendChild(label);
        if (tokens) {
          row.appendChild(createPieceRow(tokens));
        } else {
          row.appendChild(createUnkChip());
        }
        return row;
      }),
    );
  }

  return { el, render };
}
