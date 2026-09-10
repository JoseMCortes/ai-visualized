/**
 * Wires the trainer to the views. One "step" = one nudge; Play just calls Step
 * on a timer. Every step's full trace drives the map, the inspector and the
 * corpus highlight together.
 */

import { SENTENCES, tokenize } from './corpus';
import { SkipGramTrainer, type StepTrace } from './lib/skipgram';
import { createControls } from './views/controls';
import { createCorpusPanel } from './views/corpusPanel';
import { createInspector } from './views/inspector';
import { createMap, type MapArrow, type MapWord } from './views/map';
import { createSparkline } from './views/sparkline';

// Topic of each corpus word, for colour.
const TOPIC: Record<string, string> = {};
const setTopic = (topic: string, words: string) => {
  for (const w of words.split(/\s+/)) TOPIC[w] = topic;
};
setTopic('animal', 'dog cat mouse lion wolf deer runs sleeps play chases hunts hides big wild');
setTopic('food', 'eat bread cheese drink wine milk bake from');
setTopic('court', 'king queen wears crown sits throne rules castle lives prince becomes');

const TOPIC_COLOR: Record<string, string> = {
  animal: '#fbbf24',
  food: '#a78bfa',
  court: '#818cf8',
  other: '#94a3b8',
};
const colorFor = (word: string): string => TOPIC_COLOR[TOPIC[word] ?? 'other']!;

const DEFAULTS = { speed: 24, learningRate: 0.08, windowSize: 2, negatives: 3 };
const BATCH = 500;

export function mountApp(root: HTMLElement): void {
  const corpusTokens = SENTENCES.map(tokenize);
  const trainer = new SkipGramTrainer(
    corpusTokens,
    {
      learningRate: DEFAULTS.learningRate,
      windowSize: DEFAULTS.windowSize,
      negatives: DEFAULTS.negatives,
    },
    1,
  );

  // layout
  const stage = document.createElement('div');
  stage.className = 'stage';
  const mapHost = document.createElement('div');
  const side = document.createElement('div');
  side.className = 'side';
  const counters = document.createElement('div');
  counters.className = 'counters';
  const sparkHost = document.createElement('div');
  const inspectorHost = document.createElement('div');
  side.append(counters, sparkHost, inspectorHost);
  stage.append(mapHost, side);

  const corpusHost = document.createElement('div');
  const controlsHost = document.createElement('div');

  root.replaceChildren(controlsHost, stage, corpusHost);

  const map = createMap(mapHost);
  const inspector = createInspector(inspectorHost);
  const corpus = createCorpusPanel(corpusHost, SENTENCES);
  const spark = createSparkline(sparkHost);

  const controls = createControls(DEFAULTS, {
    onStep: () => {
      if (!playing) doStep();
    },
    onPlayToggle: togglePlay,
    onRunBatch: runBatch,
    onReset: reset,
    onSpeed: (v) => {
      speed = v;
      if (playing) startTimer();
    },
    onLearningRate: (v) => (trainer.opts.learningRate = v),
    onWindow: (v) => {
      trainer.opts.windowSize = v;
      trainer.rebuildPairs();
      previewNext();
    },
    onNegatives: (v) => (trainer.opts.negatives = v),
  });
  controlsHost.replaceChildren(controls.el);

  let playing = false;
  let speed = DEFAULTS.speed;
  let timer = 0;
  let emaLoss = 0; // smoothed loss for the sparkline (raw is very noisy)

  function pushLoss(v: number): void {
    emaLoss = emaLoss === 0 ? v : emaLoss * 0.92 + v * 0.08;
    spark.push(emaLoss);
  }

  function words(): MapWord[] {
    return trainer.positions().map((p) => ({
      word: p.word,
      x: p.x,
      y: p.y,
      color: colorFor(p.word),
    }));
  }

  function renderTrace(trace: StepTrace): void {
    const negWords = new Set(trace.negatives.map((s) => s.word));
    const arrows: MapArrow[] = trace.moves.map((m) => ({
      x: m.before[0],
      y: m.before[1],
      dx: m.delta[0],
      dy: m.delta[1],
      kind:
        m.word === trace.center.word ? 'center' : m.word === trace.positive.word ? 'pull' : 'push',
    }));
    map.render(words(), {
      center: trace.center.word,
      positive: trace.positive.word,
      negatives: negWords,
      arrows,
    });
    inspector.render(trace);
    corpus.render(trace.location);
    counters.textContent = `step ${trace.step} · epoch ${trace.epoch}`;
  }

  function previewNext(): void {
    const p = trainer.peekPair();
    map.render(words());
    corpus.render({
      sentenceIndex: p.sentenceIndex,
      centerPos: p.centerPos,
      contextPos: p.contextPos,
    });
  }

  function doStep(): void {
    const trace = trainer.runStep();
    pushLoss(trace.loss);
    renderTrace(trace);
  }

  function togglePlay(): void {
    playing = !playing;
    controls.setPlaying(playing);
    if (playing) startTimer();
    else window.clearInterval(timer);
  }

  function startTimer(): void {
    window.clearInterval(timer);
    timer = window.setInterval(doStep, Math.max(16, 1000 / speed));
  }

  function runBatch(): void {
    if (playing) return;
    let trace: StepTrace | null = null;
    for (let i = 0; i < BATCH; i++) {
      trace = trainer.runStep();
      pushLoss(trace.loss);
    }
    if (trace) renderTrace(trace);
  }

  function reset(): void {
    if (playing) togglePlay();
    trainer.reset();
    emaLoss = 0;
    spark.clear();
    inspector.render(null);
    counters.textContent = `step 0 · epoch 0`;
    previewNext();
  }

  inspector.render(null);
  counters.textContent = `step 0 · epoch 0`;
  previewNext();
}
