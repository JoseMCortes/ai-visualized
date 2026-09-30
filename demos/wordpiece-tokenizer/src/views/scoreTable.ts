/**
 * The candidate merges considered for the step just taken (or about to be
 * taken), ranked by score — so the arithmetic behind "why this pair, not a
 * more frequent one" is never hidden. The winner is highlighted.
 */

import type { Candidate } from '../lib/wordpiece';
import { createPieceChip } from './pieceChip';

export interface ScoreTable {
  el: HTMLElement;
  render(candidates: Candidate[]): void;
}

export function createScoreTable(): ScoreTable {
  const el = document.createElement('div');
  el.className = 'score-table';

  const head = document.createElement('div');
  head.className = 'st-row st-head';
  head.innerHTML = `
    <span>pair</span>
    <span>freq</span>
    <span>left</span>
    <span>right</span>
    <span>score = freq &divide; (left&times;right)</span>
  `;
  const rows = document.createElement('div');
  rows.className = 'st-rows';
  el.append(head, rows);

  function render(candidates: Candidate[]): void {
    if (candidates.length === 0) {
      rows.innerHTML = `<p class="st-empty">No pairs left to merge — every word is a single token.</p>`;
      return;
    }
    const maxScore = Math.max(...candidates.map((c) => c.score));
    rows.replaceChildren(
      ...candidates.map((c, i) => {
        const row = document.createElement('div');
        row.className = 'st-row' + (i === 0 ? ' is-winner' : '');

        const pair = document.createElement('span');
        pair.className = 'st-pair';
        pair.append(createPieceChip(c.left), createPieceChip(c.right));
        const arrow = document.createElement('span');
        arrow.className = 'st-pair-arrow';
        arrow.textContent = '→';
        pair.appendChild(arrow);
        pair.appendChild(createPieceChip(c.merged));

        const pairFreq = numCell(c.pairFreq.toString());
        const leftFreq = numCell(c.leftFreq.toString());
        const rightFreq = numCell(c.rightFreq.toString());

        const scoreCell = document.createElement('span');
        scoreCell.className = 'st-score';
        const bar = document.createElement('span');
        bar.className = 'st-bar';
        const fill = document.createElement('span');
        fill.style.width = `${(c.score / maxScore) * 100}%`;
        bar.appendChild(fill);
        const val = document.createElement('span');
        val.className = 'st-score-num';
        val.textContent = c.score.toFixed(4);
        scoreCell.append(bar, val);

        row.append(pair, pairFreq, leftFreq, rightFreq, scoreCell);
        return row;
      }),
    );
  }

  function numCell(text: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'st-num';
    span.textContent = text;
    return span;
  }

  return { el, render };
}
