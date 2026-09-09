/**
 * Wires the model to the views. No framework: a small store holds the state,
 * and every change re-renders the arc diagram, the heatmap and the
 * probability bars from the same forward pass.
 *
 * Two things you can do:
 *   - edit the text and inspect the attention for any character
 *   - press Generate and watch the model extend the text one character at a
 *     time, with the probability bars showing where each character came from
 */

import { candidateIds, loadModelFromUrl, mulberry32, sampleFromLogits, softmax } from './inference';
import type { GPTModel } from './inference/model';
import type { ForwardTrace } from './inference/types';
import { createStore } from './store';
import { attentionMatrix, scoreMatrix, type HeadSelection } from './views/attentionData';
import { createArcDiagram } from './views/arcDiagram';
import { createComputeSteps } from './views/computeSteps';
import { createControls } from './views/controls';
import { createGenControls } from './views/genControls';
import { createHeatmap } from './views/heatmap';
import { createProbBars } from './views/probBars';

const DEFAULT_TEXT = 'To be, or not to be, that is';
const STEP_MS = 55;
const GEN_BATCH = 64;

interface State {
  text: string;
  chars: string[];
  promptLen: number;
  trace: ForwardTrace | null;
  truncated: boolean;
  layer: number;
  head: HeadSelection;
  focus: number | null;
  generating: boolean;
  genLeft: number;
  temperature: number;
  topK: number;
  topP: number;
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
    promptLen: [...DEFAULT_TEXT].length,
    trace: null,
    truncated: false,
    layer: 0,
    head: 'mean',
    focus: null,
    generating: false,
    genLeft: 0,
    temperature: 0.9,
    topK: 20,
    topP: 1,
  });

  let rng = mulberry32(1);

  const controls = createControls(DEFAULT_TEXT, {
    onText: (v) => {
      stopGen();
      scheduleApply(v);
    },
    onLayer: (l) => store.set({ layer: l }),
    onHead: (h) => store.set({ head: h }),
  });

  const gen = createGenControls(
    { generating: false, temperature: 0.9, topK: 20, topP: 1, atLimit: false },
    {
      onGenerate: startGen,
      onStop: stopGen,
      onReset: resetToPrompt,
      onTemperature: (v) => store.set({ temperature: v }),
      onTopK: (v) => store.set({ topK: v }),
      onTopP: (v) => store.set({ topP: v }),
    },
  );

  const stage = document.createElement('div');
  stage.className = 'stage';
  const arcHost = document.createElement('div');
  const lower = document.createElement('div');
  lower.className = 'lower';
  const heatHost = document.createElement('div');
  const rightCol = document.createElement('div');
  rightCol.className = 'rightcol';
  const probHost = document.createElement('div');
  const computeHost = document.createElement('div');
  const caption = document.createElement('p');
  caption.className = 'caption';
  rightCol.append(probHost, computeHost, caption);
  lower.append(heatHost, rightCol);
  stage.append(arcHost, lower);
  root.replaceChildren(controls.el, gen.el, stage);

  const arc = createArcDiagram(arcHost, (i) => store.set({ focus: i }));
  const heat = createHeatmap(heatHost, (i) => store.set({ focus: i }));
  const bars = createProbBars(probHost);
  const compute = createComputeSteps(computeHost);

  let timer = 0;
  function scheduleApply(text: string): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => applyText(text, [...text].length), 120);
  }

  function applyText(text: string, promptLen: number): void {
    const all = [...text];
    const chars = all.slice(0, model.blockSize);
    const trace = chars.length ? model.forward(model.encode(chars.join(''))) : null;
    store.set({
      text,
      chars,
      promptLen: Math.min(promptLen, chars.length),
      trace,
      truncated: all.length > model.blockSize,
      focus: null,
      generating: false,
    });
  }

  function atLimit(s: State): boolean {
    return s.chars.length >= model.blockSize;
  }

  function startGen(): void {
    const s = store.get();
    if (s.generating || atLimit(s) || !s.trace) return;
    rng = mulberry32((Math.random() * 2 ** 31) | 0);
    store.set({ generating: true, genLeft: GEN_BATCH, focus: null });
    window.setTimeout(step, STEP_MS);
  }

  function stopGen(): void {
    if (store.get().generating) store.set({ generating: false });
  }

  function resetToPrompt(): void {
    const s = store.get();
    const prompt = s.chars.slice(0, s.promptLen).join('');
    applyText(prompt, s.promptLen);
  }

  function step(): void {
    const s = store.get();
    if (!s.generating || !s.trace) return;
    if (atLimit(s) || s.genLeft <= 0) {
      store.set({ generating: false });
      return;
    }
    const logits = s.trace.logits[s.trace.logits.length - 1]!;
    const { id } = sampleFromLogits(
      logits,
      { temperature: s.temperature, topK: s.topK, topP: s.topP },
      rng,
    );
    const text = s.text + (model.vocab.itos[id] ?? '');
    const chars = [...text];
    const trace = model.forward(model.encode(text));
    store.set({ text, chars, trace, genLeft: s.genLeft - 1, focus: null });
    window.setTimeout(step, STEP_MS);
  }

  function currentLayer(s: State): number {
    return Math.min(s.layer, (s.trace?.nLayer ?? 1) - 1);
  }

  /** The distribution for the character the model would produce next. */
  function nextDistribution(s: State): number[] {
    if (!s.trace) return [];
    const logits = s.trace.logits[s.trace.logits.length - 1]!;
    const t = s.temperature > 0 ? s.temperature : 1e-4;
    return softmax(logits.map((x) => x / t));
  }

  function draw(s: State): void {
    controls.update({ nLayer: n_layer, nHead: n_head, layer: currentLayer(s), head: s.head });
    gen.update({
      generating: s.generating,
      temperature: s.temperature,
      topK: s.topK,
      topP: s.topP,
      atLimit: atLimit(s),
    });

    if (!s.trace || s.chars.length === 0) {
      bars.render(model.vocab.itos, [], null);
      caption.textContent = '';
      return;
    }

    const layer = currentLayer(s);
    const matrix = attentionMatrix(s.trace, layer, s.head);
    arc.render(s.chars, matrix, s.focus, { promptLen: s.promptLen });
    heat.render(s.chars, matrix, s.focus);

    const probs = nextDistribution(s);
    const kept = s.temperature > 0 ? new Set(candidateIds(probs, s.topK, s.topP)) : null;
    bars.render(model.vocab.itos, probs, kept);

    const active = s.focus ?? s.chars.length - 1;
    const headText = s.head === 'mean' ? 'averaged over all heads' : `head ${s.head + 1}`;
    compute.render(
      s.chars,
      scoreMatrix(s.trace, layer, s.head),
      matrix,
      active,
      `layer ${layer + 1}, ${headText}`,
    );
    const genCount = s.chars.length - s.promptLen;
    caption.textContent =
      `Layer ${layer + 1} of ${s.trace.nLayer}, ${headText}. ` +
      `Character ${active} (${JSON.stringify(s.chars[active] ?? '')}) is highlighted; each arc points ` +
      `to an earlier character it attends to. Hover any character to follow its attention.` +
      (genCount > 0
        ? ` The ${genCount} tinted character${genCount === 1 ? '' : 's'} were generated.`
        : '') +
      (s.truncated ? ` Text was clipped to the ${model.blockSize}-character context window.` : '');
  }

  store.subscribe(draw);
  window.addEventListener('resize', () => draw(store.get()));

  applyText(DEFAULT_TEXT, [...DEFAULT_TEXT].length);
}
