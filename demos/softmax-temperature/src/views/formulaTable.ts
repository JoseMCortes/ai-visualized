/**
 * The live per-row breakdown: score -> score/T -> exp(score/T) -> probability,
 * each stage shown as a number so the arithmetic is never hidden, plus a bar
 * mirroring the final probability. Re-rendered on every T or vector change —
 * there is no natural "step" inside one softmax evaluation, so this syncs
 * straight off the current state rather than an animated reveal.
 */

import { colorFor } from '../lib/palette';
import type { SoftmaxResult } from '../lib/softmax';

export interface FormulaTable {
  el: HTMLElement;
  render(result: SoftmaxResult, labels: string[]): void;
}

export function createFormulaTable(): FormulaTable {
  const el = document.createElement('div');
  el.className = 'formula-table';

  const head = document.createElement('div');
  head.className = 'ft-row ft-head';
  head.innerHTML = `
    <span></span>
    <span>label</span>
    <span>score (x)</span>
    <span>x / T</span>
    <span>e^(x/T)</span>
    <span>probability</span>
  `;
  const rows = document.createElement('div');
  rows.className = 'ft-rows';
  el.append(head, rows);

  function render(result: SoftmaxResult, labels: string[]): void {
    const maxExp = Math.max(...result.rows.map((r) => r.expValue));
    rows.replaceChildren(
      ...result.rows.map((r) => {
        const row = document.createElement('div');
        row.className = 'ft-row' + (r.index === result.argmax ? ' is-winner' : '');
        row.style.setProperty('--row-color', colorFor(r.index));

        const swatch = document.createElement('span');
        swatch.className = 'ft-swatch';

        const label = document.createElement('span');
        label.className = 'ft-label';
        label.textContent = labels[r.index] ?? String(r.index);

        const score = document.createElement('span');
        score.className = 'ft-num';
        score.textContent = r.score.toFixed(2);

        const scaled = document.createElement('span');
        scaled.className = 'ft-num';
        scaled.textContent = r.scaled.toFixed(2);

        const expEl = document.createElement('span');
        expEl.className = 'ft-num ft-exp';
        const expBar = document.createElement('span');
        expBar.className = 'ft-exp-fill';
        expBar.style.width = `${(r.expValue / maxExp) * 100}%`;
        const expLabel = document.createElement('span');
        expLabel.textContent = r.expValue >= 100 ? r.expValue.toFixed(0) : r.expValue.toFixed(2);
        expEl.append(expBar, expLabel);

        const prob = document.createElement('span');
        prob.className = 'ft-prob';
        const probBar = document.createElement('span');
        probBar.className = 'ft-bar';
        const probFill = document.createElement('span');
        probFill.className = 'ft-bar-fill';
        probFill.style.width = `${r.prob * 100}%`;
        probBar.appendChild(probFill);
        const probNum = document.createElement('span');
        probNum.className = 'ft-prob-num';
        probNum.textContent = r.prob.toFixed(2);
        prob.append(probBar, probNum);

        row.append(swatch, label, score, scaled, expEl, prob);
        return row;
      }),
    );
  }

  return { el, render };
}
