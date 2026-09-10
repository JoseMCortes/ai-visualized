/**
 * The 2-D map: one dot per word, positions already PCA-projected by the app.
 * A "camera" eases toward the swarm and zooms to fit, so the spreading-out and
 * the clusters are both visible. The focused word (a clicked word, or the
 * current step's center) is ringed, with green links to related words and red
 * links to the step's negatives.
 */

const SVG = 'http://www.w3.org/2000/svg';
const VIEW = 900;
const FILL = 0.42;

export interface MapWord {
  word: string;
  x: number;
  y: number;
  color: string;
}

export interface MapHighlight {
  focus?: string | null;
  green?: ReadonlySet<string>; // linked with a green line (positive / neighbours)
  red?: ReadonlySet<string>; // linked with a red line (negatives)
  dim?: boolean; // fade everything not focused/linked
}

export interface WordMap {
  render(words: MapWord[], highlight?: MapHighlight): void;
}

export function createMap(host: HTMLElement, onPick: (word: string | null) => void): WordMap {
  host.classList.add('map');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW} ${VIEW}`);
  host.replaceChildren(svg);
  svg.addEventListener('mouseleave', () => {
    /* keep pinned selection */
  });

  const disp = new Map<string, { x: number; y: number }>();
  const cam = { cx: 0, cy: 0, scale: VIEW * 0.2 };
  let target: MapWord[] = [];
  let hl: MapHighlight = {};
  let raf = 0;

  const sx = (wx: number): number => (wx - cam.cx) * cam.scale + VIEW / 2;
  const sy = (wy: number): number => -(wy - cam.cy) * cam.scale + VIEW / 2;

  function frame(): void {
    let moving = false;
    for (const w of target) {
      const d = disp.get(w.word) ?? { x: w.x, y: w.y };
      d.x += (w.x - d.x) * 0.2;
      d.y += (w.y - d.y) * 0.2;
      if (Math.hypot(w.x - d.x, w.y - d.y) > 1e-3) moving = true;
      disp.set(w.word, d);
    }
    if (target.length) {
      let a = Infinity;
      let b = -Infinity;
      let c = Infinity;
      let e = -Infinity;
      for (const w of target) {
        const d = disp.get(w.word)!;
        a = Math.min(a, d.x);
        b = Math.max(b, d.x);
        c = Math.min(c, d.y);
        e = Math.max(e, d.y);
      }
      const cx = (a + b) / 2;
      const cy = (c + e) / 2;
      const scale = (VIEW * FILL) / Math.max(b - a, e - c, 0.05);
      cam.cx += (cx - cam.cx) * 0.05;
      cam.cy += (cy - cam.cy) * 0.05;
      cam.scale += (scale - cam.scale) * 0.05;
      if (Math.abs(scale - cam.scale) > 0.5) moving = true;
    }
    paint();
    raf = moving ? requestAnimationFrame(frame) : 0;
  }

  function paint(): void {
    const frag = document.createDocumentFragment();
    const focus = hl.focus ?? null;
    const green = hl.green ?? new Set<string>();
    const red = hl.red ?? new Set<string>();
    const at = (w: string): { x: number; y: number } | undefined => disp.get(w);

    if (focus && at(focus)) {
      const f = at(focus)!;
      for (const [set, cls] of [
        [green, 'link-green'],
        [red, 'link-red'],
      ] as const) {
        for (const w of set) {
          const p = at(w);
          if (!p) continue;
          const l = document.createElementNS(SVG, 'line');
          l.setAttribute('x1', sx(f.x).toFixed(1));
          l.setAttribute('y1', sy(f.y).toFixed(1));
          l.setAttribute('x2', sx(p.x).toFixed(1));
          l.setAttribute('y2', sy(p.y).toFixed(1));
          l.setAttribute('class', cls);
          frag.appendChild(l);
        }
      }
    }

    for (const w of target) {
      const d = at(w.word) ?? w;
      const isFocus = w.word === focus;
      const lit = isFocus || green.has(w.word) || red.has(w.word);
      const g = document.createElementNS(SVG, 'g');
      g.setAttribute('transform', `translate(${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)})`);
      g.setAttribute(
        'class',
        'word' +
          (isFocus ? ' is-focus' : '') +
          (green.has(w.word) ? ' is-green' : '') +
          (red.has(w.word) ? ' is-red' : ''),
      );
      g.style.opacity = hl.dim && !lit ? '0.25' : '1';

      const c = document.createElementNS(SVG, 'circle');
      c.setAttribute('r', isFocus ? '6' : '3.5');
      c.setAttribute('fill', w.color);
      const t = document.createElementNS(SVG, 'text');
      t.setAttribute('x', '7');
      t.setAttribute('y', '3.5');
      t.textContent = w.word;
      const hit = document.createElementNS(SVG, 'circle');
      hit.setAttribute('r', '11');
      hit.setAttribute('fill', 'transparent');
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', () => onPick(w.word === focus ? null : w.word));
      g.append(c, t, hit);
      frag.appendChild(g);
    }
    svg.replaceChildren(frag);
  }

  function render(words: MapWord[], highlight: MapHighlight = {}): void {
    target = words;
    hl = highlight;
    for (const w of words) if (!disp.has(w.word)) disp.set(w.word, { x: w.x, y: w.y });
    if (!raf) raf = requestAnimationFrame(frame);
    else paint();
  }

  return { render };
}
