/**
 * The warm-up: a dozen words placed by hand on two labelled axes. Same maths as
 * the real panel (cosine similarity, a − b + d), just in 2 dimensions you can
 * see. Hover a word for its nearest neighbours; toggle the analogy to watch
 * "king − man + woman" land on "queen".
 */

import { analogy, nearestNeighbors } from '../lib/vectors';

const SVG = 'http://www.w3.org/2000/svg';
const W = 640;
const H = 420;
const PAD = 40;

interface ToyWord {
  label: string;
  x: number; // -1 (common)  .. 1 (royal)
  y: number; // -1 (female)  .. 1 (male)
}

// Placed so the male/female pairs sit symmetrically about the x-axis and the
// common→royal offset is the same for every pair — that is what makes
// "king − man + woman" land exactly on "queen".
const WORDS: ToyWord[] = [
  { label: 'king', x: 0.8, y: 0.72 },
  { label: 'queen', x: 0.8, y: -0.72 },
  { label: 'prince', x: 0.45, y: 0.5 },
  { label: 'princess', x: 0.45, y: -0.5 },
  { label: 'man', x: -0.75, y: 0.72 },
  { label: 'woman', x: -0.75, y: -0.72 },
  { label: 'boy', x: -0.6, y: 0.32 },
  { label: 'girl', x: -0.6, y: -0.32 },
  { label: 'father', x: -0.1, y: 0.78 },
  { label: 'mother', x: -0.1, y: -0.78 },
  { label: 'uncle', x: 0.15, y: 0.46 },
  { label: 'aunt', x: 0.15, y: -0.46 },
];

const px = (x: number): number => PAD + ((x + 1) / 2) * (W - 2 * PAD);
const py = (y: number): number => PAD + (1 - (y + 1) / 2) * (H - 2 * PAD);

function line(x1: number, y1: number, x2: number, y2: number, cls: string): SVGLineElement {
  const l = document.createElementNS(SVG, 'line');
  l.setAttribute('x1', String(x1));
  l.setAttribute('y1', String(y1));
  l.setAttribute('x2', String(x2));
  l.setAttribute('y2', String(y2));
  l.setAttribute('class', cls);
  return l;
}

function text(x: number, y: number, s: string, cls: string): SVGTextElement {
  const t = document.createElementNS(SVG, 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('class', cls);
  t.textContent = s;
  return t;
}

export function createToyPanel(host: HTMLElement): void {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'toy-svg');

  const controls = document.createElement('label');
  controls.className = 'toy-toggle';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  controls.append(toggle, document.createTextNode(' show king − man + woman'));

  const readout = document.createElement('p');
  readout.className = 'panel-note';
  readout.style.marginTop = '0.6rem';
  readout.textContent = 'Hover a word to see its nearest neighbours.';

  host.append(svg, controls, readout);

  const vecs = WORDS.map((w) => [w.x, w.y] as const);
  let hover: number | null = null;

  function draw(): void {
    const frag = document.createDocumentFragment();

    // axes
    frag.append(
      line(PAD, py(0), W - PAD, py(0), 'toy-axis'),
      line(px(0), PAD, px(0), H - PAD, 'toy-axis'),
      text(W - PAD, py(0) - 8, 'royal →', 'toy-axis-label'),
      text(PAD, py(0) - 8, '← common', 'toy-axis-label'),
      text(px(0) + 8, PAD + 6, '↑ male', 'toy-axis-label'),
      text(px(0) + 8, H - PAD, '↓ female', 'toy-axis-label'),
    );

    if (toggle.checked) {
      const iKing = 0;
      const iMan = 4;
      const iWoman = 5;
      const res = analogy(vecs[iKing]!, vecs[iMan]!, vecs[iWoman]!); // king - man + woman
      const [rx, ry] = res as [number, number];
      const [kx, ky] = vecs[iKing]!;
      // arrow 1: man -> king (the "royalty / role" offset)
      frag.append(line(px(vecs[iMan]![0]), py(vecs[iMan]![1]), px(kx), py(ky), 'toy-arrow'));
      // arrow 2: woman -> result (same offset, applied to woman)
      frag.append(line(px(vecs[iWoman]![0]), py(vecs[iWoman]![1]), px(rx), py(ry), 'toy-arrow'));
      const ring = document.createElementNS(SVG, 'circle');
      ring.setAttribute('cx', String(px(rx)));
      ring.setAttribute('cy', String(py(ry)));
      ring.setAttribute('r', '9');
      ring.setAttribute('class', 'ghost');
      frag.append(ring);
      const nearest = nearestNeighbors(res, vecs, 1, new Set([iKing, iMan, iWoman]))[0]!;
      readout.textContent = `king − man + woman lands nearest "${WORDS[nearest.index]!.label}".`;
    } else if (hover !== null) {
      const near = nearestNeighbors(vecs[hover]!, vecs, 2, new Set([hover]));
      for (const n of near) {
        frag.append(
          line(
            px(vecs[hover]![0]),
            py(vecs[hover]![1]),
            px(vecs[n.index]![0]),
            py(vecs[n.index]![1]),
            'link-line',
          ),
        );
      }
      readout.textContent =
        `Nearest to "${WORDS[hover]!.label}": ` +
        near.map((n) => `${WORDS[n.index]!.label} (${n.score.toFixed(2)})`).join(', ');
    } else {
      readout.textContent = 'Hover a word to see its nearest neighbours.';
    }

    WORDS.forEach((w, i) => {
      const g = document.createElementNS(SVG, 'g');
      g.setAttribute('transform', `translate(${px(w.x)} ${py(w.y)})`);
      g.setAttribute('class', 'dot' + (i === hover ? ' is-active' : ''));
      const c = document.createElementNS(SVG, 'circle');
      c.setAttribute('r', i === hover ? '5' : '3.5');
      c.setAttribute('fill', 'var(--accent)');
      const t = text(7, 3, w.label, 'dot-label');
      const hit = document.createElementNS(SVG, 'circle');
      hit.setAttribute('r', '12');
      hit.setAttribute('fill', 'transparent');
      g.append(c, t, hit);
      g.addEventListener('mouseenter', () => {
        hover = i;
        draw();
      });
      frag.append(g);
    });

    svg.replaceChildren(frag);
  }

  svg.addEventListener('mouseleave', () => {
    hover = null;
    draw();
  });
  toggle.addEventListener('change', draw);
  draw();
}
