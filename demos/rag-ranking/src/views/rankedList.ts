/**
 * The shared ranked-document list every method renders into: rank, title,
 * a score bar, and a faint "ground truth" badge (the relevance grade this
 * demo's answer key assigns that document for the current query) so you can
 * see at a glance how close a method's ordering is to the intended one.
 */

export interface RankedRow {
  docId: string;
  title: string;
  snippet: string;
  score: number;
  relevance: number; // 0-3, hand-authored ground truth
}

export interface RankedList {
  el: HTMLElement;
  render(rows: RankedRow[], focusId: string | null): void;
}

const RELEVANCE_LABEL = ['not relevant', 'a little relevant', 'relevant', 'highly relevant'];

export function createRankedList(onFocus: (docId: string) => void): RankedList {
  const el = document.createElement('div');
  el.className = 'ranked-list';

  function render(rows: RankedRow[], focusId: string | null): void {
    const sorted = [...rows].sort((a, b) => b.score - a.score);
    const maxAbs = Math.max(...sorted.map((r) => Math.abs(r.score)), 1e-9);

    el.replaceChildren(
      ...sorted.map((r, i) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'ranked-row' + (r.docId === focusId ? ' is-focus' : '');
        row.addEventListener('click', () => onFocus(r.docId));

        const rank = document.createElement('span');
        rank.className = 'ranked-rank';
        rank.textContent = `#${i + 1}`;

        const main = document.createElement('span');
        main.className = 'ranked-main';
        const title = document.createElement('span');
        title.className = 'ranked-title';
        title.textContent = r.title;
        const snippet = document.createElement('span');
        snippet.className = 'ranked-snippet';
        snippet.textContent = r.snippet;
        main.append(title, snippet);

        const bar = document.createElement('span');
        bar.className = 'ranked-bar';
        const fill = document.createElement('span');
        const width = Math.min(100, (Math.abs(r.score) / maxAbs) * 100);
        fill.style.width = `${Math.max(2, width)}%`;
        fill.className = r.score < 0 ? 'is-negative' : '';
        bar.appendChild(fill);

        const score = document.createElement('span');
        score.className = 'ranked-score';
        score.textContent = r.score.toFixed(2);

        const badge = document.createElement('span');
        badge.className = `ranked-badge rel-${r.relevance}`;
        badge.title = `answer key: ${RELEVANCE_LABEL[r.relevance]}`;
        badge.textContent = '●'.repeat(r.relevance) || '·';

        row.append(rank, main, bar, score, badge);
        return row;
      }),
    );
  }

  return { el, render };
}
