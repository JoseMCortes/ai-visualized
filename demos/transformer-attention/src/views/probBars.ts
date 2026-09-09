/**
 * The model's probability distribution for the next character — the bars that
 * temperature / top-k / top-p reshape.
 */

import { glyph } from './glyph';

export interface ProbBars {
  render(vocab: string[], probs: number[], keptIds?: Set<number> | null): void;
}

/** The `k` most likely tokens, highest first. */
export function topProbabilities(probs: number[], k: number): { id: number; p: number }[] {
  return probs
    .map((p, id) => ({ id, p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, Math.max(0, k));
}

export function createProbBars(host: HTMLElement): ProbBars {
  host.classList.add('probbars');
  const heading = document.createElement('div');
  heading.className = 'probbars-heading';
  heading.textContent = 'Next character';
  const list = document.createElement('div');
  list.className = 'probbars-list';
  host.replaceChildren(heading, list);

  function render(vocab: string[], probs: number[], keptIds: Set<number> | null = null): void {
    const top = topProbabilities(probs, 14);
    const scale = top[0]?.p || 1;

    list.replaceChildren(
      ...top.map(({ id, p }) => {
        const row = document.createElement('div');
        row.className = 'probbars-row';
        if (keptIds && !keptIds.has(id)) row.classList.add('is-cut');

        const label = document.createElement('span');
        label.className = 'probbars-label';
        label.textContent = glyph(vocab[id] ?? '');

        const track = document.createElement('span');
        track.className = 'probbars-track';
        const fill = document.createElement('span');
        fill.className = 'probbars-fill';
        fill.style.width = `${Math.max(1, (p / scale) * 100)}%`;
        track.appendChild(fill);

        const pct = document.createElement('span');
        pct.className = 'probbars-pct';
        pct.textContent = `${(p * 100).toFixed(1)}%`;

        row.append(label, track, pct);
        return row;
      }),
    );
  }

  return { render };
}
