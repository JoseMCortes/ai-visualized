/**
 * Part 1 wires the trainer (forward → loss → backward → update, repeated)
 * to every training view. Part 2 is separate and independent: it runs
 * brand-new sentences through whatever the matrices currently are, using
 * the exact same `forward()` function — real inference, not a rerun of
 * training.
 */

import { PYTORCH_REFERENCE } from './lib/codeSnippet';
import { describeStep } from './lib/describeStep';
import { runSentence } from './lib/inference';
import { EMBEDDINGS, TARGET, TOKENS } from './lib/setup';
import { initTrainer, trainStep, type TrainerState } from './lib/trainer';
import { createAttentionBars } from './views/attentionBars';
import { createAttentionChart } from './views/attentionChart';
import { createCodePanel } from './views/codePanel';
import { createLossChart } from './views/lossChart';
import { createMatrixView } from './views/matrixView';
import { createPlayground } from './views/playground';
import { BATCH_SIZE, createTrainingControls } from './views/trainingControls';

const PLAY_INTERVAL_MS = 450;
const DEFAULT_SENTENCE = 'the dog ran';

function panel(label?: string): { section: HTMLElement; body: HTMLElement } {
  const section = document.createElement('div');
  section.className = 'panel';
  const body = document.createElement('div');
  if (label !== undefined) {
    const title = document.createElement('div');
    title.className = 'field-label';
    title.textContent = label;
    section.appendChild(title);
  }
  section.appendChild(body);
  return { section, body };
}

function partHeading(text: string): HTMLElement {
  const h = document.createElement('h2');
  h.className = 'part-heading';
  h.textContent = text;
  return h;
}

export function mountApp(root: HTMLElement): void {
  const embeddingsPanel = panel('Embeddings for "the cat sat" (fixed — never learned)');
  const embeddingsView = createMatrixView(TOKENS);
  embeddingsPanel.body.appendChild(embeddingsView.el);

  const trainingPanel = document.createElement('div');
  trainingPanel.className = 'panel';
  const controlsHost = document.createElement('div');
  const counters = document.createElement('div');
  counters.className = 'counters';
  const controlsRow = document.createElement('div');
  controlsRow.className = 'controls-row';
  controlsRow.append(controlsHost, counters);
  const narration = document.createElement('p');
  narration.className = 'step-narration';
  trainingPanel.append(controlsRow, narration);

  const forwardPanel = panel('Forward pass — query is "sat"');
  const qRow = document.createElement('div');
  qRow.className = 'fp-row';
  const qLabel = document.createElement('div');
  qLabel.className = 'fp-label';
  qLabel.textContent = 'q = sat · W_Q';
  const qView = createMatrixView();
  qRow.append(qLabel, qView.el);

  const kRow = document.createElement('div');
  kRow.className = 'fp-row';
  const kLabel = document.createElement('div');
  kLabel.className = 'fp-label';
  kLabel.textContent = 'K = X · W_K';
  const kView = createMatrixView(TOKENS);
  kRow.append(kLabel, kView.el);

  const vRow = document.createElement('div');
  vRow.className = 'fp-row';
  const vLabel = document.createElement('div');
  vLabel.className = 'fp-label';
  vLabel.textContent = 'V = X · W_V';
  const vView = createMatrixView(TOKENS);
  vRow.append(vLabel, vView.el);

  const weightsLabel = document.createElement('div');
  weightsLabel.className = 'fp-label';
  weightsLabel.textContent = 'softmax(q·K / √3) — attention weights';
  const weightsHost = document.createElement('div');
  const attnBars = createAttentionBars(weightsHost);

  const outputRow = document.createElement('div');
  outputRow.className = 'fp-output';

  forwardPanel.body.append(qRow, kRow, vRow, weightsLabel, weightsHost, outputRow);

  const lossPanel = panel('Loss, across every training step');
  const lossChart = createLossChart(lossPanel.body);

  const attnChartPanel = panel('Attention weight, across every training step');
  const attnChart = createAttentionChart(attnChartPanel.body);

  const weightsPanel = panel('The three matrices, right now');
  const matricesRow = document.createElement('div');
  matricesRow.className = 'matrices-row';
  const wqBlock = matrixBlock('W_Q');
  const wkBlock = matrixBlock('W_K');
  const wvBlock = matrixBlock('W_V');
  matricesRow.append(wqBlock.el, wkBlock.el, wvBlock.el);
  weightsPanel.body.appendChild(matricesRow);

  const gradPanel = panel('Gradients this step — ∂loss/∂W');
  const gradRow = document.createElement('div');
  gradRow.className = 'matrices-row';
  const gqBlock = matrixBlock('∂L/∂W_Q');
  const gkBlock = matrixBlock('∂L/∂W_K');
  const gvBlock = matrixBlock('∂L/∂W_V');
  gradRow.append(gqBlock.el, gkBlock.el, gvBlock.el);
  gradPanel.body.appendChild(gradRow);

  const codePanelHost = panel('Check it yourself — the PyTorch this was verified against');
  codePanelHost.body.appendChild(createCodePanel(PYTORCH_REFERENCE));

  const playgroundPanel = panel('Try a sentence');
  let sentenceText = DEFAULT_SENTENCE;
  const playground = createPlayground((text) => {
    sentenceText = text;
    renderPlayground();
  }, DEFAULT_SENTENCE);
  playgroundPanel.body.appendChild(playground.el);

  root.replaceChildren(
    partHeading('Part 1 — training one attention head'),
    embeddingsPanel.section,
    trainingPanel,
    forwardPanel.section,
    lossPanel.section,
    attnChartPanel.section,
    weightsPanel.section,
    gradPanel.section,
    codePanelHost.section,
    partHeading('Part 2 — using the trained matrices on a new sentence'),
    playgroundPanel.section,
  );

  let trainer: TrainerState = initTrainer();
  let playing = false;
  let timer = 0;

  const controls = createTrainingControls({
    onStep: () => {
      if (!playing) doStep();
    },
    onPlayToggle: togglePlay,
    onRunBatch: runBatch,
    onReset: reset,
  });
  controlsHost.appendChild(controls.el);

  function matrixBlock(label: string): {
    el: HTMLElement;
    view: ReturnType<typeof createMatrixView>;
  } {
    const wrap = document.createElement('div');
    wrap.className = 'matrix-block';
    const title = document.createElement('div');
    title.className = 'matrix-block-label';
    title.textContent = label;
    const view = createMatrixView();
    wrap.append(title, view.el);
    return { el: wrap, view };
  }

  function renderForward(): void {
    const fwd = trainer.lastForward;
    qView.render([fwd.q]);
    kView.render(fwd.K);
    vView.render(fwd.V);
    attnBars.render(TOKENS, fwd.weights, 2);
    const out = fwd.output.map((v) => v.toFixed(2)).join(', ');
    const tgt = TARGET.map((v) => v.toFixed(2)).join(', ');
    outputRow.textContent = `output = [${out}]   ·   target = [${tgt}]`;
  }

  function renderCounters(): void {
    const lastLoss = trainer.history.at(-1)?.loss;
    counters.textContent = `${trainer.history.length} step${trainer.history.length === 1 ? '' : 's'}${lastLoss !== undefined ? ` · loss ${lastLoss.toFixed(4)}` : ''}`;
  }

  function renderCharts(): void {
    lossChart.render(trainer.history.map((h) => h.loss));
    const history = TOKENS.map((_, i) => trainer.history.map((h) => h.weights[i]!));
    attnChart.render(TOKENS, history);
  }

  function renderMatrices(): void {
    wqBlock.view.render(trainer.WQ);
    wkBlock.view.render(trainer.WK);
    wvBlock.view.render(trainer.WV);
  }

  function renderPlayground(): void {
    const result = runSentence(sentenceText, trainer.WQ, trainer.WK, trainer.WV);
    playground.render(result);
  }

  function renderAll(): void {
    renderCounters();
    renderForward();
    renderCharts();
    renderMatrices();
    renderPlayground();
  }

  function doStep(): void {
    const before = trainer.lastForward.weights;
    const result = trainStep(trainer);
    gqBlock.view.render(result.dWQ);
    gkBlock.view.render(result.dWK);
    gvBlock.view.render(result.dWV);
    narration.textContent = describeStep(before, result.loss, trainer.lastForward.weights, result);
    renderAll();
  }

  function togglePlay(): void {
    playing = !playing;
    controls.setState({ playing });
    if (playing) {
      timer = window.setInterval(doStep, PLAY_INTERVAL_MS);
    } else {
      window.clearInterval(timer);
    }
  }

  function runBatch(): void {
    if (playing) return;
    for (let i = 0; i < BATCH_SIZE; i++) doStep();
  }

  function reset(): void {
    if (playing) togglePlay();
    trainer = initTrainer();
    narration.textContent = '';
    gqBlock.view.render(trainer.WQ.map((r) => r.map(() => 0)));
    gkBlock.view.render(trainer.WK.map((r) => r.map(() => 0)));
    gvBlock.view.render(trainer.WV.map((r) => r.map(() => 0)));
    renderAll();
  }

  embeddingsView.render(EMBEDDINGS);
  gqBlock.view.render(trainer.WQ.map((r) => r.map(() => 0)));
  gkBlock.view.render(trainer.WK.map((r) => r.map(() => 0)));
  gvBlock.view.render(trainer.WV.map((r) => r.map(() => 0)));
  renderAll();
}
