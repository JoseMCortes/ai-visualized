/**
 * Wires the embedding set to the two panels. No framework: hovering a dot,
 * typing a word to look up, or editing the analogy just re-renders the plot.
 *
 * Everything it computes is cosine similarity + a sort + one vector add/subtract.
 */

import { EmbeddingSet, loadEmbeddings, type LayoutName } from './lib/embeddings';
import { createScatter, type ScatterPoint } from './views/scatter';
import { createToyPanel } from './views/toyPanel';

// Coarse groups so the plot needs only a handful of colours.
const GROUP: Record<string, string> = {
  royalty: 'people',
  family: 'people',
  country: 'place',
  capital: 'place',
  animal: 'animal',
  bird: 'animal',
  number: 'number',
  color: 'color',
  food: 'food',
  fruit: 'food',
  drink: 'food',
  verb: 'verb',
  verb_past: 'verb',
  weather: 'nature',
  size: 'nature',
  temperature: 'nature',
  time: 'nature',
  body: 'body',
  transport: 'thing',
};

const GROUP_COLOR: Record<string, string> = {
  people: '#4f46e5',
  place: '#0d9488',
  animal: '#d97706',
  number: '#db2777',
  color: '#0891b2',
  food: '#7c3aed',
  verb: '#ea580c',
  nature: '#65a30d',
  body: '#dc2626',
  thing: '#475569',
};

const colorFor = (category: string): string => GROUP_COLOR[GROUP[category] ?? 'thing']!;

export async function mountApp(root: HTMLElement): Promise<void> {
  const status = document.createElement('p');
  status.className = 'status';
  status.textContent = 'Loading word vectors…';
  root.replaceChildren(status);

  let set: EmbeddingSet;
  try {
    set = await loadEmbeddings(`${import.meta.env.BASE_URL}embeddings.json`);
  } catch (err) {
    status.textContent = `Could not load the vectors: ${err instanceof Error ? err.message : String(err)}`;
    status.classList.add('is-error');
    return;
  }

  // ---- Panel A: hand-built toy -------------------------------------
  const toy = panel(
    'A vector is just coordinates',
    'A dozen words placed by hand on two axes. Same maths as below, in 2 dimensions you can see.',
  );
  createToyPanel(toy.body);

  // ---- Panel B: real GloVe vectors ------------------------------
  const real = panel(
    `Real embeddings — ${set.data.count} GloVe words`,
    'Each word is a 50-number vector, flattened to 2-D so it can be drawn. Hover or look up a word for its nearest neighbours; edit the analogy to move along a direction.',
  );

  const layoutRow = document.createElement('div');
  layoutRow.className = 'row';
  layoutRow.innerHTML = '<label>Projection</label>';
  const seg = document.createElement('div');
  seg.className = 'seg';
  layoutRow.appendChild(seg);

  const scatterHost = document.createElement('div');
  const projHint = document.createElement('p');
  projHint.className = 'panel-note';
  projHint.style.margin = '0.5rem 0 0';
  const neighborsHost = document.createElement('div');
  neighborsHost.className = 'neighbors';

  const dl = buildVocabDatalist(set.words);
  const lookupRow = buildLookupRow();
  const analogyRow = buildAnalogyRow();
  const legend = buildLegend();

  real.body.append(
    dl,
    layoutRow,
    scatterHost,
    projHint,
    neighborsHost,
    lookupRow.el,
    analogyRow.el,
    legend,
  );
  root.replaceChildren(toy.panel, real.panel);

  // ---- state ---------------------------------------------------
  let layout: LayoutName = 'pca';
  let hover: string | null = null;

  const scatter = createScatter(scatterHost, (id) => {
    hover = id;
    render();
  });

  for (const name of ['pca', 'tsne'] as LayoutName[]) {
    const b = document.createElement('button');
    b.textContent = name.toUpperCase();
    b.className = name === layout ? 'is-on' : '';
    b.addEventListener('click', () => {
      layout = name;
      [...seg.children].forEach((c) => c.classList.toggle('is-on', c === b));
      render();
    });
    seg.appendChild(b);
  }

  lookupRow.onChange(render);
  analogyRow.onChange(render);

  function basePoints(): ScatterPoint[] {
    return set.words.map((w) => {
      const [x, y] = set.point(w, layout);
      return { id: w, x, y, color: colorFor(set.category(w)), label: w };
    });
  }

  function render(): void {
    const points = basePoints();
    const lit = new Set<string>();
    const links: { from: [number, number]; to: [number, number] }[] = [];
    let marker: { x: number; y: number; label: string } | null = null;
    let active: string | null = null;

    // A word is "focused" if you hover it, or typed it in Look up.
    const pinned = lookupRow.value();
    const focus = hover && set.has(hover) ? hover : pinned && set.has(pinned) ? pinned : null;

    if (focus) {
      active = focus;
      const near = set.neighborsOf(set.vector(focus), 6, [focus]);
      const from = set.point(focus, layout);
      for (const n of near) {
        lit.add(n.word);
        links.push({ from, to: set.point(n.word, layout) });
      }
      renderNeighborList(neighborsHost, focus, near);
    } else {
      neighborsHost.replaceChildren();

      // No focused word — show the analogy direction instead.
      const a = analogyRow.values();
      if (a && a.every((w) => set.has(w))) {
        const { vec, results } = set.analogy(a[0], a[1], a[2], 1);
        const best = results[0];
        analogyRow.setResult(best ? `≈ ${best.word}  (${best.score.toFixed(2)})` : '—');
        if (best) {
          active = best.word;
          [a[0], a[1], a[2], best.word].forEach((w) => lit.add(w));
          links.push({ from: set.point(a[1], layout), to: set.point(a[0], layout) });
          links.push({ from: set.point(a[2], layout), to: set.point(best.word, layout) });
          if (layout === 'pca') {
            const [mx, my] = set.projectPCA(vec);
            marker = { x: mx, y: my, label: `${a[0]}−${a[1]}+${a[2]}` };
          }
        }
      } else {
        analogyRow.setResult('');
      }
    }

    projHint.textContent =
      layout === 'pca'
        ? 'PCA keeps the directions with the most spread, so a straight-line offset like an analogy is meaningful here.'
        : !focus
          ? 't-SNE clumps similar words tightly to show groups — it does not keep straight-line directions, so the analogy arrows will not form a parallelogram.'
          : 't-SNE clumps similar words tightly — good for seeing groups, not directions.';

    scatter.render(points, { active, lit, dim: focus !== null, links, marker });
  }

  render();
}

/* ---------- small DOM builders ---------- */

function panel(title: string, note: string): { panel: HTMLElement; body: HTMLElement } {
  const p = document.createElement('section');
  p.className = 'panel';
  const h = document.createElement('h2');
  h.className = 'panel-title';
  h.textContent = title;
  const n = document.createElement('p');
  n.className = 'panel-note';
  n.textContent = note;
  const body = document.createElement('div');
  p.append(h, n, body);
  return { panel: p, body };
}

function buildVocabDatalist(words: string[]): HTMLDataListElement {
  const dl = document.createElement('datalist');
  dl.id = 'vocab';
  for (const w of words) {
    const o = document.createElement('option');
    o.value = w;
    dl.appendChild(o);
  }
  return dl;
}

function wordInput(value = ''): HTMLInputElement {
  const i = document.createElement('input');
  i.type = 'text';
  i.value = value;
  i.setAttribute('list', 'vocab');
  i.autocomplete = 'off';
  i.spellcheck = false;
  return i;
}

function renderNeighborList(
  host: HTMLElement,
  word: string,
  near: { word: string; score: number }[],
): void {
  const max = near[0]?.score ?? 1;
  host.replaceChildren(
    ...near.map((n) => {
      const row = document.createElement('div');
      row.className = 'neighbors-row';
      const w = document.createElement('span');
      w.textContent = n.word;
      const bar = document.createElement('span');
      bar.className = 'neighbors-bar';
      const fill = document.createElement('span');
      fill.style.width = `${Math.max(4, (n.score / max) * 100)}%`;
      bar.appendChild(fill);
      const s = document.createElement('span');
      s.textContent = n.score.toFixed(2);
      row.append(w, bar, s);
      return row;
    }),
  );
  const head = document.createElement('div');
  head.className = 'panel-note';
  head.style.margin = '0 0 0.3rem';
  head.textContent = `nearest to "${word}" (cosine similarity)`;
  host.prepend(head);
}

function buildLookupRow() {
  const el = document.createElement('div');
  el.className = 'row';
  const input = wordInput();
  input.placeholder = 'e.g. river';
  const result = document.createElement('span');
  result.className = 'result';
  result.textContent = 'or hover a dot';
  el.append(label('Look up'), input, result);

  let cb = () => {};
  input.addEventListener('input', () => cb());
  return {
    el,
    onChange(fn: () => void) {
      cb = fn;
    },
    value(): string {
      return input.value.trim().toLowerCase();
    },
  };
}

function buildAnalogyRow() {
  const el = document.createElement('div');
  el.className = 'row';
  const a = wordInput('king');
  const b = wordInput('man');
  const d = wordInput('woman');
  const result = document.createElement('span');
  result.className = 'result';
  el.append(label('Analogy'), a, op('−'), b, op('+'), d, result);

  let cb = () => {};
  for (const i of [a, b, d]) i.addEventListener('input', () => cb());
  return {
    el,
    onChange(fn: () => void) {
      cb = fn;
    },
    values(): [string, string, string] | null {
      const v = [
        a.value.trim().toLowerCase(),
        b.value.trim().toLowerCase(),
        d.value.trim().toLowerCase(),
      ];
      return v.every(Boolean) ? (v as [string, string, string]) : null;
    },
    setResult(text: string) {
      result.innerHTML = text ? `<strong>${text}</strong>` : '';
    },
  };
}

function label(s: string): HTMLElement {
  const l = document.createElement('label');
  l.textContent = s;
  return l;
}

function op(s: string): HTMLElement {
  const o = document.createElement('span');
  o.className = 'op';
  o.textContent = s;
  return o;
}

function buildLegend(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'row';
  el.style.marginTop = '1rem';
  for (const [group, color] of Object.entries(GROUP_COLOR)) {
    const s = document.createElement('span');
    s.style.cssText =
      'display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--ink-dim)';
    s.innerHTML = `<span style="width:9px;height:9px;border-radius:50%;background:${color};display:inline-block"></span>${group}`;
    el.appendChild(s);
  }
  return el;
}
