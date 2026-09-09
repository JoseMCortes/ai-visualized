/**
 * A 2-D scatter plot of words. Pure rendering: it is handed points already in
 * [-1, 1] × [-1, 1] and just maps them to the SVG. Hovering a dot calls back.
 */

const SVG = 'http://www.w3.org/2000/svg';
const W = 1000;
const H = 660;
const PAD = 36;

export interface ScatterPoint {
  id: string;
  x: number; // -1 .. 1
  y: number; // -1 .. 1
  color: string;
  label: string;
}

export interface Extra {
  /** id of the emphasized word */
  active?: string | null;
  /** ids to keep fully lit (e.g. neighbours, analogy inputs) */
  lit?: ReadonlySet<string>;
  /** when true, everything not active/lit is dimmed (used while hovering one word) */
  dim?: boolean;
  /** straight lines between two [-1,1] points */
  links?: { from: [number, number]; to: [number, number] }[];
  /** a floating marker not tied to a word (analogy result / interpolation) */
  marker?: { x: number; y: number; label: string } | null;
}

export interface Scatter {
  render(points: ScatterPoint[], extra?: Extra): void;
}

const sx = (x: number): number => PAD + ((x + 1) / 2) * (W - 2 * PAD);
const sy = (y: number): number => PAD + (1 - (y + 1) / 2) * (H - 2 * PAD);

export function createScatter(host: HTMLElement, onHover: (id: string | null) => void): Scatter {
  host.classList.add('scatter');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  host.replaceChildren(svg);
  svg.addEventListener('mouseleave', () => onHover(null));

  function render(points: ScatterPoint[], extra: Extra = {}): void {
    const {
      active = null,
      lit = new Set<string>(),
      dim = false,
      links = [],
      marker = null,
    } = extra;
    const frag = document.createDocumentFragment();

    for (const link of links) {
      const line = document.createElementNS(SVG, 'line');
      line.setAttribute('x1', sx(link.from[0]).toFixed(1));
      line.setAttribute('y1', sy(link.from[1]).toFixed(1));
      line.setAttribute('x2', sx(link.to[0]).toFixed(1));
      line.setAttribute('y2', sy(link.to[1]).toFixed(1));
      line.setAttribute('class', 'link-line');
      frag.appendChild(line);
    }

    for (const p of points) {
      const emphasised = p.id === active || lit.has(p.id);

      const g = document.createElementNS(SVG, 'g');
      g.setAttribute(
        'class',
        'dot' + (p.id === active ? ' is-active' : '') + (emphasised ? ' is-lit' : ''),
      );
      g.setAttribute('transform', `translate(${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)})`);
      g.style.opacity = dim && !emphasised ? '0.28' : '1';

      const c = document.createElementNS(SVG, 'circle');
      c.setAttribute('r', p.id === active ? '5' : '4');
      c.setAttribute('fill', p.color);
      g.appendChild(c);

      const t = document.createElementNS(SVG, 'text');
      t.setAttribute('class', 'dot-label');
      t.setAttribute('x', '6');
      t.setAttribute('y', '3');
      t.textContent = p.label;
      g.appendChild(t);

      // generous invisible hit target so hovering a word is easy
      const hit = document.createElementNS(SVG, 'circle');
      hit.setAttribute('r', '10');
      hit.setAttribute('fill', 'transparent');
      g.appendChild(hit);

      g.addEventListener('mouseenter', () => onHover(p.id));
      frag.appendChild(g);
    }

    if (marker) {
      const g = document.createElementNS(SVG, 'g');
      g.setAttribute(
        'transform',
        `translate(${sx(marker.x).toFixed(1)} ${sy(marker.y).toFixed(1)})`,
      );
      const ring = document.createElementNS(SVG, 'circle');
      ring.setAttribute('r', '6');
      ring.setAttribute('class', 'ghost');
      g.appendChild(ring);
      const t = document.createElementNS(SVG, 'text');
      t.setAttribute('class', 'dot-label');
      t.setAttribute('x', '9');
      t.setAttribute('y', '3');
      t.style.fill = 'var(--ink)';
      t.textContent = marker.label;
      g.appendChild(t);
      frag.appendChild(g);
    }

    svg.replaceChildren(frag);
  }

  return { render };
}
