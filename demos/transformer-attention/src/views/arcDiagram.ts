/**
 * The token arc diagram — the "connections lighting up" view.
 *
 * Characters sit on a baseline. For the focused query character, an arc curves
 * back to every earlier character it attends to; the more weight, the thicker
 * and more opaque the arc. A bar under each character echoes the same weight.
 */

import { accent, arcPath, clamp, emphasize } from './geometry';
import { glyph } from './glyph';

const SVG = 'http://www.w3.org/2000/svg';
const CELL = 24; // px per character
const HEIGHT = 116;
const BASE_Y = 80; // baseline for the characters
const ARC_LIFT = 66; // tallest arc
const BAR_MAX = 24; // tallest weight bar

export interface ArcDiagram {
  render(chars: string[], matrix: number[][], focus: number | null): void;
}

export function createArcDiagram(
  host: HTMLElement,
  onFocus: (index: number | null) => void,
): ArcDiagram {
  host.classList.add('arc-host');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'arc-svg');
  svg.setAttribute('height', String(HEIGHT));
  host.replaceChildren(svg);

  svg.addEventListener('mouseleave', () => onFocus(null));

  function render(chars: string[], matrix: number[][], focus: number | null): void {
    const n = chars.length;
    const width = Math.max(n * CELL, 1);
    svg.setAttribute('width', String(width));
    svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);

    const active = focus ?? n - 1; // resting state: the last character
    const weights = matrix[active] ?? [];
    const frag = document.createDocumentFragment();

    // faint baseline
    const axis = document.createElementNS(SVG, 'line');
    axis.setAttribute('x1', '0');
    axis.setAttribute('x2', String(width));
    axis.setAttribute('y1', String(BASE_Y + 0.5));
    axis.setAttribute('y2', String(BASE_Y + 0.5));
    axis.setAttribute('class', 'arc-axis');
    frag.appendChild(axis);

    // arcs from the active query back to each key j <= active
    for (let j = 0; j <= active && j < n; j++) {
      const w = weights[j] ?? 0;
      if (w < 1e-4) continue;
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute(
        'd',
        arcPath(active * CELL + CELL / 2, j * CELL + CELL / 2, BASE_Y, ARC_LIFT),
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', accent(clamp(emphasize(w), 0.06, 1)));
      path.setAttribute('stroke-width', (1 + 5 * w).toFixed(2));
      path.setAttribute('stroke-linecap', 'round');
      frag.appendChild(path);
    }

    // per-character: weight bar + glyph + hit target
    for (let i = 0; i < n; i++) {
      const x = i * CELL;
      const w = weights[i] ?? 0;

      if (w > 1e-4) {
        const bar = document.createElementNS(SVG, 'rect');
        const h = 2 + BAR_MAX * emphasize(w);
        bar.setAttribute('x', String(x + CELL / 2 - 3));
        bar.setAttribute('y', String(BASE_Y + 6));
        bar.setAttribute('width', '6');
        bar.setAttribute('height', h.toFixed(1));
        bar.setAttribute('rx', '1.5');
        bar.setAttribute('fill', accent(clamp(emphasize(w), 0.12, 1)));
        frag.appendChild(bar);
      }

      const label = document.createElementNS(SVG, 'text');
      label.setAttribute('x', String(x + CELL / 2));
      label.setAttribute('y', String(BASE_Y - 8));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'arc-char' + (i === active ? ' is-active' : ''));
      label.textContent = glyph(chars[i]!);
      frag.appendChild(label);

      const hit = document.createElementNS(SVG, 'rect');
      hit.setAttribute('x', String(x));
      hit.setAttribute('y', '0');
      hit.setAttribute('width', String(CELL));
      hit.setAttribute('height', String(HEIGHT));
      hit.setAttribute('class', 'arc-hit');
      hit.addEventListener('mouseenter', () => onFocus(i));
      hit.addEventListener('click', () => onFocus(i));
      frag.appendChild(hit);
    }

    svg.replaceChildren(frag);

    // keep the focused character in view when the row overflows the panel
    const activeX = active * CELL + CELL / 2;
    const view = host.scrollLeft;
    const port = host.clientWidth;
    if (port > 0 && (activeX < view + 48 || activeX > view + port - 48)) {
      host.scrollLeft = clamp(activeX - port / 2, 0, Math.max(0, width - port));
    }
  }

  return { render };
}
