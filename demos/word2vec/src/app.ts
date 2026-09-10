/**
 * Wires the pieces together. A text is preprocessed into a small vocabulary and
 * a list of (center, neighbour) pairs; the trainer nudges 16-D vectors one pair
 * at a time; the map shows a stabilised 2-D PCA view of them, coloured by
 * cluster. Click a word to see its nearest neighbours.
 */

import { kmeans } from './lib/kmeans';
import { pca2, project, stabilize, type Projection } from './lib/pca';
import { prepare } from './lib/preprocess';
import { Word2VecTrainer, type StepTrace } from './lib/trainer';
import { createControls } from './views/controls';
import { createMap, type MapWord } from './views/map';
import { createSparkline } from './views/sparkline';
import { createWordList } from './views/wordList';

const SOURCES = [
  { id: 'alice', label: 'Alice in Wonderland' },
  { id: 'aesop', label: "Aesop's Fables" },
  { id: 'sherlock', label: 'Sherlock Holmes' },
];

const CLUSTER_COLORS = ['#818cf8', '#fbbf24', '#4ade80', '#f472b6', '#22d3ee', '#f87171'];
const K = 4;

const DEFAULTS = {
  source: 'alice',
  vocabSize: 90,
  learningRate: 0.06,
  windowSize: 4,
  negatives: 5,
};
const DIM = 16;
const SUBSAMPLE = 3e-3;
const BATCH = 10000;
const PLAY_MS = 22;
const PROJECT_EVERY = 120;

export function mountApp(root: HTMLElement): void {
  // ---- layout ----
  const controlsHost = document.createElement('div');
  const stage = document.createElement('div');
  stage.className = 'stage';
  const mapHost = document.createElement('div');
  const side = document.createElement('div');
  side.className = 'side';
  const counters = document.createElement('div');
  counters.className = 'counters';
  const readout = document.createElement('div');
  readout.className = 'readout';
  const sparkHost = document.createElement('div');
  const listHost = document.createElement('div');
  side.append(counters, sparkHost, readout, listHost);
  stage.append(mapHost, side);
  root.replaceChildren(controlsHost, stage);

  const spark = createSparkline(sparkHost);
  const wordList = createWordList(listHost, pick);
  const map = createMap(mapHost, pick);

  // ---- state ----
  const cfg = { ...DEFAULTS };
  const textCache = new Map<string, string>();
  let trainer: Word2VecTrainer | null = null;
  let proj: Projection | null = null;
  let clusters: number[] = [];
  let selected: string | null = null;
  let lastTrace: StepTrace | null = null;
  let playing = false;
  let timer = 0;
  let emaLoss = 0;

  const controls = createControls(SOURCES, cfg, {
    onSource: (id) => {
      cfg.source = id;
      void loadAndBuild();
    },
    onPasteTrain: (text) => {
      cfg.source = 'paste';
      textCache.set('paste', text);
      void loadAndBuild();
    },
    onVocabSize: (n) => {
      cfg.vocabSize = n;
      rebuild();
    },
    onStep: () => {
      if (!playing) step();
    },
    onPlayToggle: togglePlay,
    onRunBatch: runBatch,
    onReset: reset,
    onLearningRate: (v) => trainer && (trainer.opts.learningRate = v),
    onWindow: (v) => {
      cfg.windowSize = v;
      if (trainer) {
        trainer.opts.windowSize = v;
        trainer.rebuildPairs();
      }
    },
    onNegatives: (v) => trainer && (trainer.opts.negatives = v),
  });
  controlsHost.replaceChildren(controls.el);

  // ---- build ----
  async function loadText(id: string): Promise<string> {
    if (textCache.has(id)) return textCache.get(id)!;
    const res = await fetch(`${import.meta.env.BASE_URL}texts/${id}.txt`);
    const t = await res.text();
    textCache.set(id, t);
    return t;
  }

  async function loadAndBuild(): Promise<void> {
    counters.textContent = 'loading text…';
    const text = await loadText(cfg.source);
    buildFrom(text);
  }

  function rebuild(): void {
    const text = textCache.get(cfg.source);
    if (text) buildFrom(text);
  }

  function buildFrom(text: string): void {
    stopTimer();
    playing = false;
    controls.setPlaying(false);
    const p = prepare(text, {
      vocabSize: cfg.vocabSize,
      minCount: 4,
      subsample: SUBSAMPLE,
      seed: 1,
    });
    trainer = new Word2VecTrainer(
      p.sentences,
      p.vocab,
      p.counts,
      { learningRate: cfg.learningRate, windowSize: cfg.windowSize, negatives: cfg.negatives },
      1,
      DIM,
    );
    proj = null;
    selected = null;
    lastTrace = null;
    emaLoss = 0;
    spark.clear();
    refreshProjection();
    wordList.render(trainer.vocab, p.counts, null);
    render();
  }

  // ---- projection ----
  function refreshProjection(): void {
    if (!trainer) return;
    proj = stabilize(pca2(trainer.vectors), proj, trainer.vectors);
    const pts = trainer.vectors.map((v) => project(v, proj!));
    clusters = kmeans(pts, K, 1);
  }

  function words(): MapWord[] {
    if (!trainer || !proj) return [];
    return trainer.vocab.map((word, i) => {
      const [x, y] = project(trainer!.vectors[i]!, proj!);
      return { word, x, y, color: CLUSTER_COLORS[clusters[i]! % CLUSTER_COLORS.length]! };
    });
  }

  // ---- render ----
  function render(): void {
    if (!trainer || !proj) return;
    const t = trainer;
    counters.textContent =
      `step ${t.step.toLocaleString()} · epoch ${t.epoch} · ` +
      `${t.pairCount.toLocaleString()} pairs · ${t.vocab.length} words`;

    if (selected && t.vocab.includes(selected)) {
      const near = t.neighbors(selected, 6);
      map.render(words(), { focus: selected, green: new Set(near.map((n) => n.word)), dim: true });
      readout.innerHTML =
        `nearest to <strong>${selected}</strong>: ` +
        near.map((n) => `${n.word} <span class="dim">${n.score.toFixed(2)}</span>`).join(', ');
    } else if (lastTrace) {
      const centerW = t.vocab[lastTrace.centerId]!;
      const posW = t.vocab[lastTrace.positiveId]!;
      map.render(words(), {
        focus: centerW,
        green: new Set([posW]),
        red: new Set(lastTrace.negativeIds.map((id) => t.vocab[id]!)),
      });
      readout.innerHTML =
        `nudging <strong>${centerW}</strong> ↔ <strong>${posW}</strong> together, ` +
        `apart from ${lastTrace.negativeIds.map((id) => t.vocab[id]!).join(', ')} ` +
        `<span class="dim">· alignment ${lastTrace.positiveCos.toFixed(2)}</span>`;
    } else {
      map.render(words(), {});
      readout.textContent = 'Press Step, or click a word to inspect it.';
    }
  }

  function pick(word: string | null): void {
    selected = word;
    render();
  }

  // ---- training loop ----
  function pushLoss(v: number): void {
    emaLoss = emaLoss === 0 ? v : emaLoss * 0.92 + v * 0.08;
    spark.push(emaLoss);
  }

  function step(): void {
    if (!trainer) return;
    lastTrace = trainer.runStep();
    pushLoss(lastTrace.loss);
    if (trainer.step % PROJECT_EVERY === 0) refreshProjection();
    render();
  }

  function runBatch(): void {
    if (!trainer || playing) return;
    for (let i = 0; i < BATCH; i++) {
      lastTrace = trainer.runStep();
      pushLoss(lastTrace.loss);
    }
    refreshProjection();
    render();
  }

  function togglePlay(): void {
    playing = !playing;
    controls.setPlaying(playing);
    if (playing) timer = window.setInterval(step, PLAY_MS);
    else stopTimer();
  }

  function stopTimer(): void {
    window.clearInterval(timer);
    timer = 0;
  }

  function reset(): void {
    if (!trainer) return;
    stopTimer();
    playing = false;
    controls.setPlaying(false);
    trainer.reset();
    proj = null;
    selected = null;
    lastTrace = null;
    emaLoss = 0;
    spark.clear();
    refreshProjection();
    render();
  }

  window.addEventListener('resize', render);
  void loadAndBuild();
}
