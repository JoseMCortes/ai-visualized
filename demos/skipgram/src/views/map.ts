/**
 * The 2-D map: one dot per word. A "camera" follows the swarm — it eases toward
 * the centre of all the points and zooms to keep them framed — so the early
 * spreading-out is visible and the later clusters fill the view. Positions also
 * ease toward their targets, so a step makes the dots slide.
 *
 * The current step's center / positive / negative words get rings, and each
 * word's move is drawn as an arrow (scaled up so a tiny nudge is visible).
 */

const SVG = 'http://www.w3.org/2000/svg';
const VIEW = 900;
const FILL = 0.4; // fraction of the view the swarm should span
const ARROW_SCALE = 14; // nudges are ~0.03 long — exaggerate for visibility
const EASE = 0.2;

export interface MapWord {
  word: string;
  x: number;
  y: number;
  color: string;
}

export interface MapArrow {
  x: number;
  y: number;
  dx: number;
  dy: number;
  kind: 'center' | 'pull' | 'push';
}

export interface MapHighlight {
  center?: string;
  positive?: string;
  negatives?: ReadonlySet<string>;
  arrows?: MapArrow[];
}

export interface WordMap {
  render(words: MapWord[], highlight?: MapHighlight): void;
}

export function createMap(host: HTMLElement): WordMap {
  host.classList.add('map');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW} ${VIEW}`);
  const defs = document.createElementNS(SVG, 'defs');
  const head = (id: string, fill: string): string =>
    `<marker id="${id}" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
       <path d="M0,0 L7,3.5 L0,7 Z" fill="${fill}"/>
     </marker>`;
  defs.innerHTML =
    head('ah-pull', '#4ade80') + head('ah-push', '#f87171') + head('ah-center', '#e8e8ec');
  svg.appendChild(defs);
  host.replaceChildren(svg);

  const disp = new Map<string, { x: number; y: number }>();
  const cam = { cx: 0, cy: 0, scale: VIEW * 0.25 };
  let target: MapWord[] = [];
  let highlight: MapHighlight = {};
  let raf = 0;

  const sx = (wx: number): number => (wx - cam.cx) * cam.scale + VIEW / 2;
  const sy = (wy: number): number => -(wy - cam.cy) * cam.scale + VIEW / 2;

  function frame(): void {
    let moving = false;

    // ease dot positions
    for (const w of target) {
      const d = disp.get(w.word) ?? { x: w.x, y: w.y };
      d.x += (w.x - d.x) * EASE;
      d.y += (w.y - d.y) * EASE;
      if (Math.hypot(w.x - d.x, w.y - d.y) > 1e-3) moving = true;
      disp.set(w.word, d);
    }

    // ease the camera toward the swarm's centre + extent
    if (target.length) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const w of target) {
        const d = disp.get(w.word)!;
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x);
        minY = Math.min(minY, d.y);
        maxY = Math.max(maxY, d.y);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const extent = Math.max(maxX - minX, maxY - minY, 0.6);
      const scale = (VIEW * FILL) / extent;
      cam.cx += (cx - cam.cx) * 0.06;
      cam.cy += (cy - cam.cy) * 0.06;
      cam.scale += (scale - cam.scale) * 0.06;
      if (Math.abs(scale - cam.scale) > 0.5) moving = true;
    }

    paint();
    raf = moving ? requestAnimationFrame(frame) : 0;
  }

  function paint(): void {
    const frag = document.createDocumentFragment();
    frag.appendChild(defs);

    const ax = document.createElementNS(SVG, 'path');
    ax.setAttribute('d', `M0,${sy(0).toFixed(1)} H${VIEW} M${sx(0).toFixed(1)},0 V${VIEW}`);
    ax.setAttribute('class', 'map-axis');
    frag.appendChild(ax);

    const negs = highlight.negatives ?? new Set<string>();
    for (const w of target) {
      const d = disp.get(w.word) ?? w;
      const g = document.createElementNS(SVG, 'g');
      g.setAttribute('transform', `translate(${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)})`);

      let ring = '';
      if (w.word === highlight.center) ring = 'is-center';
      else if (w.word === highlight.positive) ring = 'is-pos';
      else if (negs.has(w.word)) ring = 'is-neg';
      g.setAttribute('class', `word ${ring}`);

      const c = document.createElementNS(SVG, 'circle');
      c.setAttribute('r', ring === 'is-center' ? '7' : '4.5');
      c.setAttribute('fill', w.color);
      const t = document.createElementNS(SVG, 'text');
      t.setAttribute('x', '8');
      t.setAttribute('y', '4');
      t.textContent = w.word;
      g.append(c, t);
      frag.appendChild(g);
    }

    for (const a of highlight.arrows ?? []) {
      const line = document.createElementNS(SVG, 'line');
      line.setAttribute('x1', sx(a.x).toFixed(1));
      line.setAttribute('y1', sy(a.y).toFixed(1));
      line.setAttribute('x2', sx(a.x + a.dx * ARROW_SCALE).toFixed(1));
      line.setAttribute('y2', sy(a.y + a.dy * ARROW_SCALE).toFixed(1));
      line.setAttribute('class', `arrow arrow-${a.kind}`);
      const marker = a.kind === 'pull' ? 'ah-pull' : a.kind === 'push' ? 'ah-push' : 'ah-center';
      line.setAttribute('marker-end', `url(#${marker})`);
      frag.appendChild(line);
    }

    svg.replaceChildren(frag);
  }

  function render(words: MapWord[], hl: MapHighlight = {}): void {
    target = words;
    highlight = hl;
    for (const w of words) if (!disp.has(w.word)) disp.set(w.word, { x: w.x, y: w.y });
    if (!raf) raf = requestAnimationFrame(frame);
    else paint();
  }

  return { render };
}

export { ARROW_SCALE };
