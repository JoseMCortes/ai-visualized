/**
 * Wires the trainer to every view. One "step" = one merge — the highest-
 * scoring pair, applied everywhere it occurs. Everything downstream (the
 * vocabulary, the watch words, the playground) just re-reads the trainer's
 * current state after each step; there's no separate "display" model to
 * keep in sync.
 */

import { CORPUS, HELD_OUT_WATCH_WORDS, IN_CORPUS_WATCH_WORDS } from './lib/corpus';
import { tokenizeText, tokenizeWord } from './lib/tokenize';
import { initTrainer, rankCandidates, trainStep, type TrainerState } from './lib/wordpiece';
import { createCorpusPanel } from './views/corpusPanel';
import { createPlayground } from './views/playground';
import { createScoreTable } from './views/scoreTable';
import { BATCH_SIZE, createTrainingControls } from './views/trainingControls';
import { createVocabList } from './views/vocabList';
import { createWatchWords } from './views/watchWords';

const PLAY_INTERVAL_MS = 320;
const DEFAULT_PLAYGROUND_TEXT = 'players happily rebuilding unhelpful runners';

function panel(label?: string): { section: HTMLElement; body: HTMLElement; title?: HTMLElement } {
  const section = document.createElement('div');
  section.className = 'panel';
  const body = document.createElement('div');
  if (label === undefined) {
    section.appendChild(body);
    return { section, body };
  }
  const title = document.createElement('div');
  title.className = 'field-label';
  title.textContent = label;
  section.append(title, body);
  return { section, body, title };
}

export function mountApp(root: HTMLElement): void {
  const corpus = panel('Training corpus (word · count)');
  const training = document.createElement('div');
  training.className = 'panel training-panel';
  const controlsHost = document.createElement('div');
  const counters = document.createElement('div');
  counters.className = 'counters';
  training.append(controlsHost, counters);

  const scores = panel('Candidate merges for the next step (top 6, highest score first)');
  const vocab = panel('Learned vocabulary');
  const inCorpus = panel();
  const heldOut = panel();
  const playgroundPanel = panel('Try it yourself');

  root.replaceChildren(
    corpus.section,
    training,
    scores.section,
    vocab.section,
    inCorpus.section,
    heldOut.section,
    playgroundPanel.section,
  );

  createCorpusPanel(corpus.body, CORPUS);

  const scoreTable = createScoreTable();
  scores.body.appendChild(scoreTable.el);

  const vocabTitleEl = vocab.title!;
  const vocabList = createVocabList();
  vocab.body.appendChild(vocabList.el);

  const inCorpusWords = createWatchWords({
    title: 'In the training corpus',
    note: 'These are actually being merged right now — this is training, not a preview of it.',
  });
  inCorpus.body.appendChild(inCorpusWords.el);

  const heldOutWords = createWatchWords({
    title: 'Never seen during training',
    note:
      'These were never in the training data. Each is tokenized live against whatever ' +
      'vocabulary exists so far — the same thing the playground below does.',
  });
  heldOut.body.appendChild(heldOutWords.el);

  let playgroundText = DEFAULT_PLAYGROUND_TEXT;
  const playground = createPlayground((text) => {
    playgroundText = text;
    renderPlayground();
  }, DEFAULT_PLAYGROUND_TEXT);
  playgroundPanel.body.appendChild(playground.el);

  let trainer: TrainerState = initTrainer(CORPUS);
  const baseVocab = [...trainer.vocab].sort();
  let playing = false;
  let finished = false;
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

  function vocabInOrder(): string[] {
    return [...baseVocab, ...trainer.merges.map((m) => m.winner.merged)];
  }

  function renderCounters(): void {
    counters.textContent = `${trainer.merges.length} merge${trainer.merges.length === 1 ? '' : 's'} · vocabulary size ${trainer.vocab.size}${finished ? ' · training complete — every word is now a single token' : ''}`;
  }

  const SCORE_TABLE_LIMIT = 6;

  function renderScoreTable(): void {
    scoreTable.render(rankCandidates(trainer).slice(0, SCORE_TABLE_LIMIT));
  }

  function renderVocab(newestCount: number): void {
    vocabTitleEl.textContent = `Learned vocabulary (${trainer.vocab.size} symbols)`;
    vocabList.render(vocabInOrder(), newestCount);
  }

  function renderWatchWords(): void {
    inCorpusWords.render(
      IN_CORPUS_WATCH_WORDS.map((word) => ({ word, tokens: trainer.splits.get(word) ?? null })),
    );
    heldOutWords.render(
      HELD_OUT_WATCH_WORDS.map((word) => ({ word, tokens: tokenizeWord(word, trainer.vocab) })),
    );
  }

  function renderPlayground(): void {
    playground.renderResult(tokenizeText(playgroundText, trainer.vocab));
  }

  function renderAll(newestCount: number): void {
    renderCounters();
    renderScoreTable();
    renderVocab(newestCount);
    renderWatchWords();
    renderPlayground();
  }

  function doStep(): boolean {
    const result = trainStep(trainer);
    if (!result) {
      finished = true;
      controls.setState({ playing: false, finished });
      renderAll(0);
      return false;
    }
    renderAll(1);
    return true;
  }

  function togglePlay(): void {
    playing = !playing;
    controls.setState({ playing, finished });
    if (playing) {
      timer = window.setInterval(() => {
        if (!doStep()) togglePlay();
      }, PLAY_INTERVAL_MS);
    } else {
      window.clearInterval(timer);
    }
  }

  function runBatch(): void {
    if (playing) return;
    let advanced = 0;
    for (let i = 0; i < BATCH_SIZE; i++) {
      if (!trainStep(trainer)) {
        finished = true;
        break;
      }
      advanced++;
    }
    controls.setState({ playing: false, finished });
    renderAll(advanced);
  }

  function reset(): void {
    if (playing) togglePlay();
    trainer = initTrainer(CORPUS);
    finished = false;
    controls.setState({ playing: false, finished });
    renderAll(0);
  }

  controls.setState({ playing: false, finished });
  renderAll(0);
}
