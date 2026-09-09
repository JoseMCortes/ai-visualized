/**
 * The attention matrix as a grid: one row per query character, one column per
 * key character, cell brightness = attention weight. The row for the focused
 * query is outlined; hovering a row focuses that query.
 */

import { accent, clamp, emphasize } from './geometry';
import { glyph } from './glyph';

export interface Heatmap {
  render(chars: string[], matrix: number[][], focus: number | null): void;
}

const PAD = 34; // gutter for the character labels
const MAX_CELL = 24;
const MIN_CELL = 6;

export function createHeatmap(host: HTMLElement, onFocus: (index: number | null) => void): Heatmap {
  host.classList.add('heatmap-host');
  const canvas = document.createElement('canvas');
  const readout = document.createElement('div');
  readout.className = 'heatmap-readout';
  host.replaceChildren(canvas, readout);
  const ctx = canvas.getContext('2d')!;

  let cell = MAX_CELL;
  let count = 0;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const row = Math.floor((e.clientY - rect.top - PAD) / cell);
    if (row >= 0 && row < count) onFocus(row);
  });
  canvas.addEventListener('mouseleave', () => onFocus(null));

  function render(chars: string[], matrix: number[][], focus: number | null): void {
    count = chars.length;
    const dpr = window.devicePixelRatio || 1;
    const avail = host.clientWidth || 460;
    cell = clamp(Math.floor((avail - PAD) / Math.max(count, 1)), MIN_CELL, MAX_CELL);
    const size = PAD + cell * count;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const active = focus ?? count - 1;
    const showLabels = cell >= 9;

    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < count; i++) {
      for (let j = 0; j <= i; j++) {
        const w = matrix[i]?.[j] ?? 0;
        ctx.fillStyle = accent(clamp(emphasize(w), 0.02, 1));
        ctx.fillRect(PAD + j * cell + 0.5, PAD + i * cell + 0.5, cell - 1, cell - 1);
      }
    }

    // focused query row: outline + faint dimming of the rest
    if (active >= 0 && active < count) {
      ctx.fillStyle = 'rgba(11, 11, 15, 0.55)';
      ctx.fillRect(PAD, PAD, cell * count, cell * active);
      ctx.fillRect(PAD, PAD + cell * (active + 1), cell * count, cell * (count - active - 1));
      ctx.strokeStyle = accent(0.9);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(PAD + 0.5, PAD + active * cell + 0.5, cell * count - 1, cell - 1);
    }

    if (showLabels) {
      ctx.fillStyle = '#8b8b99';
      // key characters along the top, rotated so they never collide
      ctx.textAlign = 'left';
      for (let j = 0; j < count; j++) {
        ctx.save();
        ctx.translate(PAD + j * cell + cell / 2, PAD - 5);
        ctx.rotate(-Math.PI / 3);
        ctx.fillText(glyph(chars[j]!), 0, 0);
        ctx.restore();
      }
      // query characters down the left
      ctx.textAlign = 'right';
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = i === active ? '#e8e8ec' : '#8b8b99';
        ctx.fillText(glyph(chars[i]!), PAD - 6, PAD + i * cell + cell / 2);
      }
    }

    readout.textContent = describeRow(chars, matrix, active);
  }

  return { render };
}

/** One-line summary of the focused query row: which key it attends to most. */
function describeRow(chars: string[], matrix: number[][], active: number): string {
  if (active < 0) return '';
  const q = `query ${active} ${JSON.stringify(glyph(chars[active] ?? ''))}`;
  if (active === 0) return `${q} — the first character, nothing to attend to`;
  const row = matrix[active] ?? [];
  let best = 0;
  for (let j = 1; j <= active; j++) if ((row[j] ?? 0) > (row[best] ?? 0)) best = j;
  const w = (row[best] ?? 0).toFixed(3);
  return `${q} — attends most to key ${best} ${JSON.stringify(glyph(chars[best] ?? ''))} (${w})`;
}
