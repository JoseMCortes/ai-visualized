/**
 * "Where does that arc weight come from?" — for the focused query character,
 * show the scaled dot-product score against each key and how softmax turns
 * those scores into the weights the other views draw.
 */

import { accent, clamp, emphasize } from './geometry';
import { glyph } from './glyph';

export interface ComputeSteps {
  render(
    chars: string[],
    scores: number[][],
    weights: number[][],
    active: number,
    headLabel: string,
  ): void;
}

/** Indices of the `k` keys the query attends to most, strongest first. */
export function topKeysByWeight(weights: number[], k: number): number[] {
  return weights
    .map((w, j) => ({ w, j }))
    .filter((e) => e.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, k)
    .map((e) => e.j);
}

export function createComputeSteps(host: HTMLElement): ComputeSteps {
  host.classList.add('compute');
  const heading = document.createElement('div');
  heading.className = 'compute-heading';
  const formula = document.createElement('div');
  formula.className = 'compute-formula';
  formula.textContent = 'weightⱼ = exp(scoreⱼ) / Σ exp(score)   ·   scoreⱼ = qᵢ · kⱼ / √dₖ';
  const rows = document.createElement('div');
  rows.className = 'compute-rows';
  host.replaceChildren(heading, formula, rows);

  function render(
    chars: string[],
    scores: number[][],
    weights: number[][],
    active: number,
    headLabel: string,
  ): void {
    const scoreRow = scores[active] ?? [];
    const weightRow = weights[active] ?? [];
    const keys = topKeysByWeight(weightRow, 8);

    heading.textContent =
      active <= 0
        ? `Character 0 ${JSON.stringify(glyph(chars[0] ?? ''))} attends only to itself.`
        : `Query ${active} ${JSON.stringify(glyph(chars[active] ?? ''))} · ${headLabel} · ${active + 1} keys, top ${keys.length} shown`;

    rows.replaceChildren(
      ...keys.map((j) => {
        const row = document.createElement('div');
        row.className = 'compute-row';

        const key = document.createElement('span');
        key.className = 'compute-key';
        key.textContent = `${j} ${glyph(chars[j] ?? '')}`;

        const score = document.createElement('span');
        score.className = 'compute-score';
        const sv = scoreRow[j] ?? 0;
        score.textContent = sv.toFixed(2);
        score.dataset.sign = sv >= 0 ? 'pos' : 'neg';

        const arrow = document.createElement('span');
        arrow.className = 'compute-arrow';
        arrow.textContent = '→';

        const weight = document.createElement('span');
        weight.className = 'compute-weight';
        const wv = weightRow[j] ?? 0;
        const bar = document.createElement('span');
        bar.className = 'compute-weight-bar';
        bar.style.width = `${clamp(emphasize(wv), 0.02, 1) * 100}%`;
        bar.style.background = accent(0.9);
        const num = document.createElement('span');
        num.className = 'compute-weight-num';
        num.textContent = wv.toFixed(3);
        weight.append(bar, num);

        row.append(key, score, arrow, weight);
        return row;
      }),
    );
  }

  return { render };
}
