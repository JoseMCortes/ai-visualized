/**
 * Wires the six ranking methods to one shared document list and a
 * method-specific "how this score was computed" panel. Everything is
 * precomputed once by buildDataset() except the two trained methods, which
 * start untrained and learn as you Step / Play / Run them.
 */

import { queryById } from './corpus';
import { buildDataset, hybridForQuery, statsFor, type Dataset } from './lib/dataset';
import { tfidfBreakdown } from './lib/tfidf';
import { bm25Breakdown } from './lib/bm25';
import { cosineBreakdown } from './lib/miniEmbeddings';
import { CrossEncoderToy, toExamples } from './lib/crossEncoderToy';
import { LearningToRank, toRankExamples } from './lib/ltr';
import { FEATURE_NAMES, featureArray } from './lib/features';

import { createMethodTabs, METHODS, type MethodId } from './views/methodTabs';
import { createQueryPicker } from './views/queryPicker';
import { createRankedList, type RankedRow } from './views/rankedList';
import { createTermTable } from './views/termTable';
import { createVectorCompare } from './views/vectorCompare';
import { createHybridControls } from './views/hybridControls';
import { createTrainingControls } from './views/trainingControls';
import { createFeatureBars } from './views/featureBars';
import { createTreeView } from './views/treeView';
import { createSparkline } from './views/sparkline';

export function mountApp(root: HTMLElement): void {
  const ds: Dataset = buildDataset();

  // ---- layout shell ----
  const tabsHost = document.createElement('div');
  const queryHost = document.createElement('div');
  const methodDesc = document.createElement('p');
  methodDesc.className = 'method-desc';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const listHost = document.createElement('div');
  const breakdownHost = document.createElement('div');
  breakdownHost.className = 'breakdown';
  stage.append(listHost, breakdownHost);
  root.append(tabsHost, queryHost, methodDesc, stage);

  const tabs = createMethodTabs((id) => {
    state.method = id;
    state.focusId = null;
    renderAll();
  });
  tabsHost.appendChild(tabs.el);

  const queryPicker = createQueryPicker(ds.queries, (id) => {
    state.queryId = id;
    state.focusId = null;
    renderAll();
  });
  queryHost.appendChild(queryPicker.el);

  const rankedList = createRankedList((docId) => {
    state.focusId = docId;
    renderBreakdown();
  });
  listHost.appendChild(rankedList.el);

  // ---- one sub-panel per method, toggled by `hidden` ----
  const tfidfPanel = document.createElement('div');
  const tfidfTable = createTermTable();
  tfidfPanel.appendChild(tfidfTable.el);

  const bm25Panel = document.createElement('div');
  const bm25Table = createTermTable();
  bm25Panel.appendChild(bm25Table.el);

  const embedPanel = document.createElement('div');
  const vectorCompare = createVectorCompare();
  const embedNote = document.createElement('p');
  embedNote.className = 'panel-note';
  embedNote.innerHTML =
    'These 8-number vectors were trained once, the moment the page loaded, the same way as in ' +
    '<a href="../skipgram/">Training a Word Embedding, Step by Step</a> — nudging words that ' +
    'appear near each other closer together.';
  embedPanel.append(vectorCompare.el, embedNote);

  const hybridPanel = document.createElement('div');
  const hybridControls = createHybridControls((alpha) => {
    state.alpha = alpha;
    renderAll();
  });
  hybridPanel.appendChild(hybridControls.el);

  const crossPanel = document.createElement('div');
  const crossCounters = document.createElement('div');
  crossCounters.className = 'counters';
  const crossSparkHost = document.createElement('div');
  const crossSpark = createSparkline(crossSparkHost);
  const crossControls = createTrainingControls('Run 100', {
    onStep: () => {
      if (!crossPlaying) crossStep();
    },
    onPlayToggle: crossToggle,
    onRunBatch: crossRunBatch,
    onReset: crossReset,
  });
  const crossWeights = createFeatureBars('Learned weights (and bias)');
  const crossFeatureNote = document.createElement('div');
  crossFeatureNote.className = 'field-label';
  crossFeatureNote.textContent = 'For the focused document';
  const crossFeatureTable = createTermTable();
  crossPanel.append(
    crossControls.el,
    crossCounters,
    crossSparkHost,
    crossWeights.el,
    crossFeatureNote,
    crossFeatureTable.el,
  );

  const ltrPanel = document.createElement('div');
  const ltrCounters = document.createElement('div');
  ltrCounters.className = 'counters';
  const ltrSparkHost = document.createElement('div');
  const ltrSpark = createSparkline(ltrSparkHost);
  const ltrControls = createTrainingControls('Run 10', {
    onStep: () => {
      if (!ltrPlaying) ltrStep();
    },
    onPlayToggle: ltrToggle,
    onRunBatch: ltrRunBatch,
    onReset: ltrReset,
  });
  const ltrTree = createTreeView();
  const ltrImportance = createFeatureBars('Feature importance so far');
  ltrPanel.append(ltrControls.el, ltrCounters, ltrSparkHost, ltrTree.el, ltrImportance.el);

  breakdownHost.append(tfidfPanel, bm25Panel, embedPanel, hybridPanel, crossPanel, ltrPanel);

  const panels = new Map<MethodId, HTMLElement>([
    ['tfidf', tfidfPanel],
    ['bm25', bm25Panel],
    ['embeddings', embedPanel],
    ['hybrid', hybridPanel],
    ['crossEncoder', crossPanel],
    ['ltr', ltrPanel],
  ]);

  // ---- state ----
  const state = {
    method: 'tfidf' as MethodId,
    queryId: ds.queries[0]!.id,
    focusId: null as string | null,
    alpha: 0.5,
  };
  const crossEncoder = new CrossEncoderToy(toExamples(ds.pairList));
  const ltr = new LearningToRank(toRankExamples(ds.pairList));
  let lastImportance = FEATURE_NAMES.map(() => 0);
  let crossPlaying = false;
  let crossTimer = 0;
  let ltrPlaying = false;
  let ltrTimer = 0;

  // ---- scoring ----
  function scoreDoc(method: MethodId, queryId: string, docId: string): number {
    const s = statsFor(ds, queryId, docId);
    switch (method) {
      case 'tfidf':
        return tfidfBreakdown(ds.corpus, queryById(queryId).text, docId).total;
      case 'bm25':
        return s.bm25;
      case 'embeddings':
        return s.cosine;
      case 'hybrid':
        return hybridForQuery(ds, queryId, state.alpha).find((r) => r.docId === docId)!.hybrid;
      case 'crossEncoder':
        return crossEncoder.predict(s.features);
      case 'ltr':
        return ltr.score(queryId, docId);
    }
  }

  function allRows(method: MethodId, queryId: string): RankedRow[] {
    return ds.docs.map((d) => ({
      docId: d.id,
      title: d.title,
      snippet: d.text,
      score: scoreDoc(method, queryId, d.id),
      relevance: statsFor(ds, queryId, d.id).relevance,
    }));
  }

  // ---- render ----
  function renderAll(): void {
    tabs.setActive(state.method);
    queryPicker.setActive(state.queryId);
    methodDesc.textContent = METHODS.find((m) => m.id === state.method)!.description;
    for (const [id, panel] of panels) panel.hidden = id !== state.method;

    const rows = allRows(state.method, state.queryId);
    if (!state.focusId || !rows.some((r) => r.docId === state.focusId)) {
      state.focusId = [...rows].sort((a, b) => b.score - a.score)[0]!.docId;
    }
    rankedList.render(rows, state.focusId);
    renderBreakdown();
  }

  function renderBreakdown(): void {
    rankedList.render(allRows(state.method, state.queryId), state.focusId);
    const query = queryById(state.queryId);
    const docId = state.focusId!;
    const doc = ds.docs.find((d) => d.id === docId)!;
    const s = statsFor(ds, state.queryId, docId);

    if (state.method === 'tfidf') {
      const b = tfidfBreakdown(ds.corpus, query.text, docId);
      tfidfTable.setRows(
        b.rows.map((r) => ({
          term: r.term,
          inDoc: r.inDoc,
          parts: [
            { label: 'tf', value: String(r.tf) },
            { label: 'idf', value: r.idf.toFixed(2) },
          ],
          contribution: r.contribution,
        })),
        'score = Σ over query words of  term frequency × idf',
      );
    } else if (state.method === 'bm25') {
      const b = bm25Breakdown(ds.corpus, query.text, docId);
      bm25Table.setRows(
        b.rows.map((r) => ({
          term: r.term,
          inDoc: r.inDoc,
          parts: [
            { label: 'tf', value: String(r.tf) },
            { label: 'idf', value: r.idf.toFixed(2) },
            { label: 'saturated', value: r.saturatedTf.toFixed(2) },
          ],
          contribution: r.contribution,
        })),
        `document length ${b.docLength} words, corpus average ${b.avgLength.toFixed(1)}`,
      );
    } else if (state.method === 'embeddings') {
      const qVec = ds.embeddings.bagVector(query.text);
      const dVec = ds.embeddings.bagVector(doc.text);
      vectorCompare.setVectors(qVec, dVec, cosineBreakdown(qVec, dVec).cosine);
    } else if (state.method === 'hybrid') {
      const alpha = state.alpha;
      hybridControls.setBreakdown(
        s.bm25Norm,
        s.cosineNorm,
        alpha,
        alpha * s.bm25Norm + (1 - alpha) * s.cosineNorm,
      );
    } else if (state.method === 'crossEncoder') {
      crossCounters.textContent = `epoch ${crossEncoder.epoch}`;
      crossWeights.render([
        ...FEATURE_NAMES.map((n, i) => ({ label: n, value: crossEncoder.weights[i]! })),
        { label: 'bias', value: crossEncoder.bias },
      ]);
      const x = featureArray(s.features);
      crossFeatureTable.setRows(
        FEATURE_NAMES.map((n, i) => ({
          term: n,
          inDoc: true,
          parts: [
            { label: 'value', value: x[i]!.toFixed(2) },
            { label: 'weight', value: crossEncoder.weights[i]!.toFixed(2) },
          ],
          contribution: x[i]! * crossEncoder.weights[i]!,
        })),
        `predicted score = Σ (feature × weight) + bias (${crossEncoder.bias.toFixed(2)})`,
      );
    } else if (state.method === 'ltr') {
      ltrCounters.textContent = `round ${ltr.trees.length}`;
      ltrTree.render(ltr.trees[ltr.trees.length - 1] ?? null, ltr.trees.length);
      ltrImportance.render(
        FEATURE_NAMES.map((n, i) => ({ label: n, value: lastImportance[i] ?? 0 })),
      );
    }
  }

  // ---- cross-encoder training loop ----
  function crossStep(): void {
    const r = crossEncoder.step();
    crossSpark.push(r.loss);
    renderAll();
  }
  function crossToggle(): void {
    crossPlaying = !crossPlaying;
    crossControls.setPlaying(crossPlaying);
    if (crossPlaying) crossTimer = window.setInterval(crossStep, 90);
    else {
      window.clearInterval(crossTimer);
      crossTimer = 0;
    }
  }
  function crossRunBatch(): void {
    if (crossPlaying) return;
    let r;
    for (let i = 0; i < 100; i++) {
      r = crossEncoder.step();
      crossSpark.push(r.loss);
    }
    renderAll();
  }
  function crossReset(): void {
    if (crossPlaying) crossToggle();
    crossEncoder.reset();
    crossSpark.clear();
    renderAll();
  }

  // ---- learning-to-rank training loop ----
  function ltrStep(): void {
    const r = ltr.step();
    lastImportance = r.importance;
    ltrSpark.push(r.pairwiseLoss);
    renderAll();
  }
  function ltrToggle(): void {
    ltrPlaying = !ltrPlaying;
    ltrControls.setPlaying(ltrPlaying);
    if (ltrPlaying) ltrTimer = window.setInterval(ltrStep, 420);
    else {
      window.clearInterval(ltrTimer);
      ltrTimer = 0;
    }
  }
  function ltrRunBatch(): void {
    if (ltrPlaying) return;
    let r;
    for (let i = 0; i < 10; i++) {
      r = ltr.step();
      lastImportance = r.importance;
      ltrSpark.push(r.pairwiseLoss);
    }
    renderAll();
  }
  function ltrReset(): void {
    if (ltrPlaying) ltrToggle();
    ltr.reset();
    lastImportance = FEATURE_NAMES.map(() => 0);
    ltrSpark.clear();
    renderAll();
  }

  renderAll();
}
