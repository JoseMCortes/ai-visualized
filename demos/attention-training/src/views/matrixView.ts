/**
 * A matrix rendered as shaded cells so magnitude and sign are visible at a
 * glance, not just as a grid of numbers — blue for positive, red for
 * negative, shading toward white near zero. Every matrix shown in this demo
 * (weights and gradients alike) can be signed, so the same diverging
 * encoding applies uniformly.
 */

import type { Mat } from '../lib/matrix';

export interface MatrixView {
  el: HTMLElement;
  render(M: Mat): void;
}

export function createMatrixView(rowLabels?: string[]): MatrixView {
  const el = document.createElement('div');
  el.className = 'matrix-view';

  function render(M: Mat): void {
    const maxAbs = Math.max(1e-9, ...M.flat().map((v) => Math.abs(v)));
    el.style.setProperty('--cols', String(M[0]!.length));
    el.replaceChildren(
      ...M.flatMap((row, i) => {
        const cells = row.map((v) => {
          const cell = document.createElement('span');
          cell.className = 'mv-cell';
          const t = Math.min(1, Math.abs(v) / maxAbs);
          const hue = v >= 0 ? '42, 120, 214' : '227, 73, 72'; // #2a78d6 / #e34948
          cell.style.background = `rgba(${hue}, ${(t * 0.6).toFixed(2)})`;
          cell.textContent = v.toFixed(2);
          return cell;
        });
        if (rowLabels) {
          const label = document.createElement('span');
          label.className = 'mv-row-label';
          label.textContent = rowLabels[i]!;
          return [label, ...cells];
        }
        return cells;
      }),
    );
    el.classList.toggle('has-labels', !!rowLabels);
  }

  return { el, render };
}
