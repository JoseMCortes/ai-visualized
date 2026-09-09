/**
 * Wires the model to the two views. No framework: a small store holds the
 * state, and every change re-renders the arc diagram and the heatmap from the
 * same attention matrix.
 */

import { loadModelFromUrl } from './inference';
import type { GPTModel } from './inference/model';
import type { ForwardTrace } from './inference/types';
import { createStore } from './store';
import { attentionMatrix, type HeadSelection } from './views/attentionData';
import { createArcDiagram } from './views/arcDiagram';
import { createControls } from './views/controls';
import { createHeatmap } from './views/heatmap';

const DEFAULT_TEXT = 'To be, or not to be, that is';

interface State {
  text: string;
  chars: string[];
  trace: ForwardTrace | null;
  truncated: boolean;
  layer: number;
  head: HeadSelection;
  focus: number | null;
}

export async function mountApp(root: HTMLElement): Promise<void> {
  const status = document.createElement('p');
  status.className = 'status';
  status.textContent = 'Loading the model (~0.8 MB)…';
  root.replaceChildren(status);

  let model: GPTModel;
  try {
    model = await loadModelFromUrl(`${import.meta.env.BASE_URL}model`);
  } catch (err) {
    status.textContent = `Could not load the model: ${err instanceof Error ? err.message : String(err)}`;
    status.classList.add('is-error');
    return;
  }

  const { n_layer, n_head } = model.config.arch;
  const store = createStore<State>({
    text: DEFAULT_TEXT,
    chars: [],
    trace: null,
    truncated: false,
    layer: 0,
    head: 'mean',
    focus: null,
  });

  const controls = createControls(DEFAULT_TEXT, {
    onText: (v) => scheduleRecompute(v),
    onLayer: (l) => store.set({ layer: l }),
    onHead: (h) => store.set({ head: h }),
  });

  const stage = document.createElement('div');
  stage.className = 'stage';
  const arcHost = document.createElement('div');
  const lower = document.createElement('div');
  lower.className = 'lower';
  const heatHost = document.createElement('div');
  const caption = document.createElement('p');
  caption.className = 'caption';
  lower.append(heatHost, caption);
  stage.append(arcHost, lower);
  root.replaceChildren(controls.el, stage);

  const arc = createArcDiagram(arcHost, (i) => store.set({ focus: i }));
  const heat = createHeatmap(heatHost, (i) => store.set({ focus: i }));

  let timer = 0;
  function scheduleRecompute(text: string): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => recompute(text), 120);
  }

  function recompute(text: string): void {
    const limit = model.blockSize;
    const all = [...text];
    const chars = all.slice(0, limit);
    const trace = chars.length ? model.forward(model.encode(chars.join(''))) : null;
    store.set({ text, chars, trace, truncated: all.length > limit, focus: null });
  }

  function currentLayer(s: State): number {
    return Math.min(s.layer, (s.trace?.nLayer ?? 1) - 1);
  }

  function draw(s: State): void {
    if (!s.trace || s.chars.length === 0) return;
    const layer = currentLayer(s);
    const matrix = attentionMatrix(s.trace, layer, s.head);
    arc.render(s.chars, matrix, s.focus);
    heat.render(s.chars, matrix, s.focus);

    const active = s.focus ?? s.chars.length - 1;
    const headText = s.head === 'mean' ? 'averaged over all heads' : `head ${s.head + 1}`;
    caption.textContent =
      `Layer ${layer + 1} of ${s.trace.nLayer}, ${headText}. ` +
      `Character ${active} (${JSON.stringify(s.chars[active] ?? '')}) is highlighted; ` +
      `each arc and bar points to an earlier character it attends to — thicker means more weight. ` +
      `Hover any character to follow its attention; the first character has nothing to look back at.` +
      (s.truncated
        ? ` Input was clipped to the ${limitLabel(model.blockSize)} the model can see.`
        : '');
  }

  store.subscribe((s) => {
    controls.update({ nLayer: n_layer, nHead: n_head, layer: currentLayer(s), head: s.head });
    draw(s);
  });

  window.addEventListener('resize', () => draw(store.get()));

  recompute(DEFAULT_TEXT);
}

function limitLabel(n: number): string {
  return `${n} characters`;
}
